 export function errorHandler(err, req, res, next) {
     console.error(err.stack);
     const status = err.status || 500;
     const message =
       status < 500 && err.message ? err.message : "Internal server error";
     res.status(status).json({ error: message });
   }