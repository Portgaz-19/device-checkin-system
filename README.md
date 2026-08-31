VerifyGate:
An application that allows students to securely check-in and checkout of campus buildings with their smart devices.

cd server && npm run dev - to run the backend
cd client && npm run dev - to run the frontend

NOTE:
DO NOT EVER COMMIT .ENV!!!

## Deployment (planned, not yet live)

Backend is configured for Render (server/render.yaml), frontend for Vercel (client/vercel.json). Actual deployment - creating the services, setting real environment variables in each platform's dashboard - is a separate future task.
