import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AssessmentReport } from '../components/assessment/AssessmentReport';
import { supabase } from '../lib/supabase';

const Spinner = () => (
  <svg
    className="animate-spin w-8 h-8 text-brand"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
);

export const TestReportPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const sessionId = searchParams.get('session_id') || 'b1d7500c-9aee-40b3-947f-1011dd72b0db';
    const [result, setResult] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchResult = async () => {
            setLoading(true);
            const { data } = await supabase
                .from('analysis_results')
                .select('*')
                .eq('assessment_id', sessionId)
                .single();

            if (data) {
                setResult(data);
            }
            setLoading(false);
        };
        fetchResult();
    }, [sessionId]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background text-text-primary">
                <Spinner />
            </div>
        );
    }

    if (!result) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background text-text-muted px-4">
                <p className="text-sm font-medium">Result not found for {sessionId}</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-text-primary p-4">
            <AssessmentReport
                userName="Test Candidate"
                sessionId={sessionId}
                result={result}
                onClose={() => {}}
            />
        </div>
    );
};

