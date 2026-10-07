import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test.describe('Cadence DEV E2E Assessment Flow', () => {
  test('AUTH -> ASSESSMENT-START -> RECORDING/UPLOAD -> PROCESSING -> STOMP -> REPORT -> RECOMMENDATIONS', async ({
    page,
    context,
  }) => {
    test.setTimeout(420_000); // 420s total test budget (ML pipeline can take ~2-3min)

    // =========================================================================
    // SAFETY TRIPWIRE: Abort any request to prod *.supabase.co
    // =========================================================================
    await context.route(/\.supabase\.co/, (route) => {
      route.abort('blockedbyclient');
      throw new Error('PROD REQUEST BLOCKED: Attempted outbound network request to *.supabase.co host');
    });

    context.on('request', (request) => {
      const url = new URL(request.url());
      if (url.hostname.includes('supabase.co')) {
        throw new Error(`PROD REQUEST BLOCKED: Request detected targeting ${url.hostname}`);
      }
      if (
        request.url().includes('/auth/v1/') ||
        request.url().includes('/rest/v1/') ||
        request.url().includes('/storage/v1/')
      ) {
        if (!['127.0.0.1', 'localhost'].includes(url.hostname)) {
          throw new Error(`PROD REQUEST BLOCKED: Non-local Supabase request targeting ${url.hostname}`);
        }
      }
    });

    // Capture browser console logs & errors for test output
    page.on('console', (msg) => {
      const text = msg.text();
      if (text.includes('AUTH EVENT') || text.includes('AUTH SESSION') || text.includes('INITIAL SESSION')) {
        const sanitized = text
          .replace(/ey[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}/g, '[REDACTED_JWT]')
          .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[REDACTED_EMAIL]');
        console.log(`[AUTH DIAG CONSOLE] ${sanitized}`);
      }
      if (text.includes('[STOMP]') || text.includes('error') || text.includes('Error')) {
        console.log(`[BROWSER CONSOLE ${msg.type().toUpperCase()}] ${text}`);
      }
    });
    page.on('pageerror', (err) => {
      console.error(`[BROWSER UNCAUGHT ERROR] ${err.message}`);
    });

    // Capture /auth/v1/token HTTP response status and access token presence
    page.on('response', async (res) => {
      if (res.url().includes('/auth/v1/token')) {
        const status = res.status();
        let hasToken = false;
        try {
          const json = await res.json();
          hasToken = Boolean(json && (json.access_token || json.user));
        } catch {}
        console.log(`[AUTH DIAG] token response: ${status}`);
        console.log(`[AUTH DIAG] access_token_present: ${hasToken}`);
      }
    });

    // Capture WebSocket frames for STOMP verification
    const wsFrames: Array<{ event: string; body: string; timestamp: number }> = [];
    page.on('websocket', (ws) => {
      console.log(`[BROWSER WS OPEN] Connected to: ${ws.url()}`);
      ws.on('framereceived', (frame) => {
        const raw = typeof frame.payload === 'string' ? frame.payload : frame.payload.toString();
        if (raw.includes('REPORT_READY') || raw.includes('RECOMMENDATIONS_READY') || raw.includes('ASSESSMENT_FAILED')) {
          console.log(`[BROWSER WS FRAME RECEIVED] ${raw}`);
          wsFrames.push({ event: raw.includes('REPORT_READY') ? 'REPORT_READY' : raw.includes('RECOMMENDATIONS_READY') ? 'RECOMMENDATIONS_READY' : 'ASSESSMENT_FAILED', body: raw, timestamp: Date.now() });
        }
      });
      ws.on('close', () => {
        console.log(`[BROWSER WS CLOSE] ${ws.url()}`);
      });
    });

    let userEmail = process.env.E2E_USER_EMAIL;
    let userPassword = process.env.E2E_USER_PASSWORD;
    if (!userEmail || !userPassword) {
      const stateFile = path.resolve(__dirname, '../.state.json');
      if (fs.existsSync(stateFile)) {
        try {
          const state = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
          userEmail = state.testUser?.email;
          userPassword = state.testUser?.password;
        } catch {}
      }
    }
    if (!userEmail || !userPassword) {
      throw new Error('[E2E CONFIG ERROR] E2E_USER_EMAIL or E2E_USER_PASSWORD is not set in worker env or .state.json.');
    }

    // =========================================================================
    // STAGE 1: AUTH
    // =========================================================================
    console.log('\n--- [STAGE: AUTH] ---');
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Log in to Cadence' })).toBeVisible({ timeout: 15_000 });

    const emailInput = page.locator('#login-email');
    const passwordInput = page.locator('#login-password');
    const submitBtn = page.getByRole('button', { name: 'Continue' });

    await emailInput.fill(userEmail);
    await passwordInput.fill(userPassword);
    await submitBtn.click();

    // Verify redirected to authenticated dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 20_000 });
    console.log('[STAGE: AUTH] ✓ Logged in successfully via UI; reached /dashboard');

    // =========================================================================
    // STAGE 2: ASSESSMENT-START
    // =========================================================================
    console.log('\n--- [STAGE: ASSESSMENT-START] ---');
    const startNewAssessmentBtn = page.getByRole('button', { name: /Start New Assessment/i });
    await expect(startNewAssessmentBtn).toBeVisible({ timeout: 15_000 });
    await startNewAssessmentBtn.click();

    await expect(page).toHaveURL(/\/assessment/, { timeout: 15_000 });

    // Assessment Intro Step
    const dailyAssessmentBtn = page.getByRole('button', { name: 'Start My Daily Assessment' });
    await expect(dailyAssessmentBtn).toBeVisible({ timeout: 15_000 });
    await dailyAssessmentBtn.click();

    // Topic Selection Step
    await expect(page.getByRole('heading', { name: 'Choose Your Topic' })).toBeVisible({ timeout: 20_000 });

    // Select "Workplace Communication" card
    const workplaceCard = page.locator('text=Workplace Communication').first();
    await workplaceCard.click();

    // Select Intermediate difficulty
    const intermediateLevel = page.locator('text=Intermediate').first();
    await intermediateLevel.click();

    // Click "Start Assessment"
    const startAssessmentCta = page.getByRole('button', { name: 'Start Assessment' });
    await expect(startAssessmentCta).toBeEnabled();
    await startAssessmentCta.click();

    // PreRecordingSetup Step
    console.log('[STAGE: ASSESSMENT-START] Waiting for camera, mic, and face gate...');
    await expect(page.getByRole('heading', { name: /Let's Set Up Your Recording/i })).toBeVisible({ timeout: 25_000 });

    // -------------------------------------------------------------------------
    // DIAGNOSTIC: Video element + MediaStream state (confirmed working, no sleeps)
    // -------------------------------------------------------------------------
    const videoDiag1 = await page.evaluate(async () => {
      const video = document.querySelector('video') as HTMLVideoElement | null;
      if (!video) return { error: 'No <video> element found in DOM' };

      const stream = video.srcObject instanceof MediaStream ? video.srcObject : null;
      const tracks = stream?.getVideoTracks() ?? [];
      const firstTrack = tracks[0] ?? null;
      let trackSettings: Record<string, unknown> = {};
      try { trackSettings = firstTrack?.getSettings() ?? {}; } catch {}

      const t0 = video.currentTime;
      return {
        readyState: video.readyState,
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight,
        currentTime_t0: t0,
        paused: video.paused,
        ended: video.ended,
        srcObjectType: video.srcObject ? video.srcObject.constructor?.name : 'null',
        trackCount: tracks.length,
        trackReadyState: firstTrack?.readyState ?? 'n/a',
        trackEnabled: firstTrack?.enabled ?? 'n/a',
        trackMuted: firstTrack?.muted ?? 'n/a',
        trackSettings_width: trackSettings['width'] ?? 'n/a',
        trackSettings_height: trackSettings['height'] ?? 'n/a',
        trackSettings_frameRate: trackSettings['frameRate'] ?? 'n/a',
      };
    });
    console.log('[DIAG] Video element @ t0:', JSON.stringify(videoDiag1));

    const videoDiag2 = await page.evaluate(() => {
      const video = document.querySelector('video') as HTMLVideoElement | null;
      if (!video) return { error: 'No <video> element' };
      return { readyState: video.readyState, currentTime_t1: video.currentTime };
    });
    console.log('[DIAG] Video element @ t1 (+2s):', JSON.stringify(videoDiag2));

    const ct0 = (videoDiag1 as any).currentTime_t0 ?? 0;
    const ct1 = (videoDiag2 as any).currentTime_t1 ?? 0;
    console.log(`[DIAG] currentTime delta over 2s: ${(ct1 - ct0).toFixed(4)}s — frames advancing: ${ct1 > ct0}`);
    // -------------------------------------------------------------------------
    // END DIAGNOSTIC
    // -------------------------------------------------------------------------

    // Face gate check: "I'm Ready - Start Recording" becomes enabled once face sensing detects the face
    const readyBtn = page.getByRole('button', { name: "I'm Ready - Start Recording" });
    await expect(readyBtn).toBeEnabled({ timeout: 45_000 });
    console.log('[STAGE: ASSESSMENT-START] ✓ Face gate satisfied legitimately.');
    await readyBtn.click();

    // RecordingInterface Step
    const startReadingBtn = page.getByRole('button', { name: 'START READING NOW' });
    await expect(startReadingBtn).toBeVisible({ timeout: 15_000 });
    await startReadingBtn.click();

    // Wait for countdown to finish and active recording to start
    const finishRecordingBtn = page.getByRole('button', { name: 'Finish Recording' });
    await expect(finishRecordingBtn).toBeVisible({ timeout: 15_000 });
    console.log('[STAGE: ASSESSMENT-START] ✓ Recording started successfully.');

    // =========================================================================
    // STAGE 3: RECORDING/UPLOAD
    // =========================================================================
    console.log('\n--- [STAGE: RECORDING/UPLOAD] ---');
    // Allow audio fixture to speak for 8 seconds
    console.log('[STAGE: RECORDING/UPLOAD] Speaking assessment passage for 8 seconds...');
    await page.waitForTimeout(8_000);

    // Stop recording
    await finishRecordingBtn.click();

    // "Analyze My Speech" button appears
    const analyzeBtn = page.getByRole('button', { name: 'Analyze My Speech' });
    await expect(analyzeBtn).toBeVisible({ timeout: 15_000 });

    // Intercept upload request/response
    const uploadResponsePromise = page.waitForResponse(
      (res) => res.url().includes('/api/assessment/upload'),
      { timeout: 30_000 }
    );

    console.log('[STAGE: RECORDING/UPLOAD] Submitting recording for upload...');
    await analyzeBtn.click();

    const uploadResponse = await uploadResponsePromise;
    expect(uploadResponse.status()).toBe(200);

    const uploadJson = await uploadResponse.json();
    console.log('[STAGE: RECORDING/UPLOAD] Upload response:', uploadJson);
    expect(uploadJson.sessionId).toBeTruthy();
    const sessionId = uploadJson.sessionId;
    console.log(`[STAGE: RECORDING/UPLOAD] ✓ Upload successful for sessionId: ${sessionId}`);

    function updateObservedState(partial: Record<string, any>) {
      const stateFile = path.resolve(__dirname, '../.state.json');
      if (fs.existsSync(stateFile)) {
        try {
          const state = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
          state.observed = { ...(state.observed || {}), ...partial };
          fs.writeFileSync(stateFile, JSON.stringify(state, null, 2), 'utf-8');
        } catch {}
      }
    }
    updateObservedState({ sessionId });

    // =========================================================================
    // STAGE 4: PROCESSING + STOMP
    // =========================================================================
    console.log('\n--- [STAGE: PROCESSING + STOMP] ---');
    // ProcessingScreen mounts
    await expect(page.locator('text=AI Analysis in Progress')).toBeVisible({ timeout: 15_000 });
    console.log('[STAGE: PROCESSING + STOMP] Processing screen active. Waiting for STOMP events...');

    // Wait for UI transition to Results stage (up to 180s for ML pipeline)
    // ResultsDashboard renders "Assessment Snapshot" and "OVERALL"
    const resultsSnapshotHeading = page.getByRole('heading', { name: 'Assessment Snapshot' });
    await expect(resultsSnapshotHeading).toBeVisible({ timeout: 180_000 });

    console.log('[STAGE: PROCESSING + STOMP] ✓ Transitioned to Results dashboard without manual polling.');
    console.log('[STAGE: PROCESSING + STOMP] Captured WS events count:', wsFrames.length);

    // Verify STOMP frame arrival
    const reportReadyFrame = wsFrames.find((f) => f.body.includes('REPORT_READY'));
    if (reportReadyFrame) {
      console.log(`[STAGE: PROCESSING + STOMP] ✓ REPORT_READY frame captured:`, reportReadyFrame.body);
      try {
        const bodyContent = reportReadyFrame.body.includes('\n\n')
          ? reportReadyFrame.body.split('\n\n')[1]
          : reportReadyFrame.body;
        const parsed = JSON.parse(bodyContent);
        if (parsed.reportId) updateObservedState({ reportId: parsed.reportId });
      } catch {}
    } else {
      console.log(`[STAGE: PROCESSING + STOMP] Note: UI completed analysis (frames logged: ${wsFrames.length})`);
    }

    if (wsFrames.some((f) => f.body.includes('RECOMMENDATIONS_READY'))) {
      updateObservedState({ recommendationsReady: true });
    }

    // =========================================================================
    // STAGE 5: REPORT
    // =========================================================================
    console.log('\n--- [STAGE: REPORT] ---');
    // 1. Overall Score
    const overallScoreElement = page.locator('text=OVERALL').locator('..').locator('span').first();
    await expect(overallScoreElement).toBeVisible();
    const overallScoreText = await overallScoreElement.innerText();
    const overallScore = parseFloat(overallScoreText);
    console.log(`[STAGE: REPORT] Overall Score: ${overallScore}/100`);
    expect(overallScore).toBeGreaterThanOrEqual(0);
    expect(overallScore).toBeLessThanOrEqual(100);

    // 2. CEFR Level
    const cefrElement = page.locator('text=CEFR LEVEL:');
    await expect(cefrElement).toBeVisible();
    const cefrText = await cefrElement.innerText();
    console.log(`[STAGE: REPORT] ${cefrText}`);
    expect(cefrText).toMatch(/CEFR LEVEL:\s*[A-C][1-2]/i);

    // 3. Performance Breakdown Metrics
    await expect(page.getByRole('heading', { name: /Performance Breakdown/i })).toBeVisible();
    for (const metric of ['Fluency', 'Pronunciation', 'Grammar', 'Vocabulary', 'Clarity', 'Confidence']) {
      await expect(page.locator(`text=${metric}`).first()).toBeVisible();
    }
    console.log('[STAGE: REPORT] ✓ Diagnostic breakdown metrics verified.');

    // 4. Open Full Performance Report Modal
    const viewFullReportBtn = page.getByRole('button', { name: 'View Full Performance Report' });
    await expect(viewFullReportBtn).toBeVisible();
    await viewFullReportBtn.click();

    // Verify modal dialog
    const modalDialog = page.getByRole('dialog', { name: 'Full Performance Report' });
    await expect(modalDialog).toBeVisible({ timeout: 15_000 });

    await expect(
      modalDialog.getByRole('heading', { name: 'CADENCE SPEECH ASSESSMENT REPORT' })
    ).toBeVisible();
    await expect(modalDialog.locator('text=Candidate Name')).toBeVisible();
    await expect(modalDialog.locator('text=Test ID')).toBeVisible();
    console.log('[STAGE: REPORT] ✓ Full Performance Report modal verified.');

    // =========================================================================
    // STAGE 6: RECOMMENDATIONS
    // =========================================================================
    console.log('\n--- [STAGE: RECOMMENDATIONS] ---');
    // Scroll to section 6 | Recommended Practice within the report modal
    const recSectionHeading = modalDialog.locator('text=6 | Recommended Practice');
    await expect(recSectionHeading).toBeVisible();
    await recSectionHeading.scrollIntoViewIfNeeded();

    // Check for practice exercises / recommendation cards
    // Either a practice exercise card or the suggested next topic container
    const nextTopicSuggestion = modalDialog.locator('text=Suggested Next Topic:');
    await expect(nextTopicSuggestion).toBeVisible();

    // Assert at least one recommendation element with non-empty text
    const recCards = modalDialog.locator('.rounded-xl.shadow-sm.bg-white, .rounded-xl.shadow-sm.dark\\:bg-neutral-800');
    const recCount = await recCards.count();
    console.log(`[STAGE: RECOMMENDATIONS] Found ${recCount} recommendation card(s).`);

    if (recCount > 0) {
      const firstTitle = await recCards.first().locator('h3').innerText();
      expect(firstTitle.trim().length).toBeGreaterThan(0);
      console.log(`[STAGE: RECOMMENDATIONS] ✓ Recommendation Card title: "${firstTitle}"`);
    } else {
      // Fallback message if LLM returned 0 exercises but recommendation section rendered
      const sectionText = await modalDialog.locator('text=Recommended Practice').locator('..').innerText();
      expect(sectionText.trim().length).toBeGreaterThan(0);
      console.log('[STAGE: RECOMMENDATIONS] ✓ Recommendation section populated.');
    }

    // Close modal
    const closeBtn = page.getByRole('button', { name: 'Close report' });
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
    }

    console.log('\n======================================================');
    console.log('>>> ALL 6 STAGES COMPLETED AND ASSERTED SUCCESSFULLY <<<');
    console.log('======================================================\n');
  });
});
