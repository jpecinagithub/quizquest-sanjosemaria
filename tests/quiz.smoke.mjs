import { authHeaders, registerAndLogin, request } from './smoke.common.mjs';

const run = async () => {
    const user = await registerAndLogin();

    const subjects = await request('/subjects', {
        method: 'GET',
        headers: authHeaders(user.token),
    });
    if (subjects.status !== 200 || !Array.isArray(subjects.data) || subjects.data.length === 0) {
        throw new Error(`GET /subjects failed: ${subjects.status} ${JSON.stringify(subjects.data)}`);
    }

    const subjectId = subjects.data[0]?.id;
    if (!subjectId) {
        throw new Error('No subject id available for quiz smoke test');
    }

    const canStart = await request(`/quiz/can-start/${subjectId}`, {
        method: 'GET',
        headers: authHeaders(user.token),
    });
    if (canStart.status !== 200 || typeof canStart.data?.allowed !== 'boolean') {
        throw new Error(`GET /quiz/can-start/:subjectId failed: ${canStart.status} ${JSON.stringify(canStart.data)}`);
    }

    const finish = await request('/quiz/finish', {
        method: 'POST',
        headers: {
            ...authHeaders(user.token),
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            userId: user.userId,
            subjectId,
            score: 75,
            xpEarned: 10,
            questions: [],
        }),
    });
    if (finish.status !== 200 || !finish.data?.success) {
        throw new Error(`POST /quiz/finish failed: ${finish.status} ${JSON.stringify(finish.data)}`);
    }

    console.log('Quiz smoke tests OK');
};

run().catch((error) => {
    console.error(error.message || error);
    process.exit(1);
});
