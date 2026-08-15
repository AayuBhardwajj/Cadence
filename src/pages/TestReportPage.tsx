import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Box, Spinner, Text, Center } from '@chakra-ui/react';
import { AssessmentReport } from '../components/assessment/AssessmentReport';
import { supabase } from '../lib/supabase';

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

    if (loading) return <Center h="100vh"><Spinner size="xl" /></Center>;
    if (!result) return <Center h="100vh"><Text>Result not found for {sessionId}</Text></Center>;

    return (
        <Box bg="gray.50" minH="100vh" p={4}>
            <AssessmentReport
                userName="Test Candidate"
                sessionId={sessionId}
                result={result}
                onClose={() => {}}
            />
        </Box>
    );
};
