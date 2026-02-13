import { authHeaders, loginAdmin, registerAndLogin, request } from './smoke.common.mjs';

const run = async () => {
    const user = await registerAndLogin();

    const publicSubjects = await request('/subjects', {
        method: 'GET',
        headers: authHeaders(user.token),
    });
    if (publicSubjects.status !== 200 || !Array.isArray(publicSubjects.data)) {
        throw new Error(`GET /subjects failed: ${publicSubjects.status} ${JSON.stringify(publicSubjects.data)}`);
    }

    const admin = await loginAdmin();

    const adminList = await request('/admin/subjects', {
        method: 'GET',
        headers: authHeaders(admin.token),
    });
    if (adminList.status !== 200 || !Array.isArray(adminList.data)) {
        throw new Error(`GET /admin/subjects failed: ${adminList.status} ${JSON.stringify(adminList.data)}`);
    }

    const uniqueName = `Smoke Subject ${Date.now()}`;
    const create = await request('/admin/subjects', {
        method: 'POST',
        headers: {
            ...authHeaders(admin.token),
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            name: uniqueName,
            description: 'Temporary smoke subject',
            activo: true,
        }),
    });
    if (create.status !== 201 || !create.data?.id) {
        throw new Error(`POST /admin/subjects failed: ${create.status} ${JSON.stringify(create.data)}`);
    }

    const subjectId = create.data.id;

    const deactivate = await request(`/admin/subjects/${subjectId}`, {
        method: 'DELETE',
        headers: authHeaders(admin.token),
    });
    if (deactivate.status !== 200 || !deactivate.data?.success) {
        throw new Error(`DELETE /admin/subjects/:id failed: ${deactivate.status} ${JSON.stringify(deactivate.data)}`);
    }

    const reactivate = await request(`/admin/subjects/${subjectId}`, {
        method: 'PUT',
        headers: {
            ...authHeaders(admin.token),
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            name: uniqueName,
            description: 'Temporary smoke subject',
            activo: true,
        }),
    });
    if (reactivate.status !== 200 || !reactivate.data?.success) {
        throw new Error(`PUT /admin/subjects/:id failed: ${reactivate.status} ${JSON.stringify(reactivate.data)}`);
    }

    console.log('Subjects smoke tests OK');
};

run().catch((error) => {
    console.error(error.message || error);
    process.exit(1);
});
