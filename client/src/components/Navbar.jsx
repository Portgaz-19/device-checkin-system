import { Link, useNavigate } from 'react-router-dom';

   function Navbar() {
     const navigate = useNavigate();
     const token = localStorage.getItem('token');

     const handleLogout = () => {
       localStorage.removeItem('token');
       navigate('/login');
     };

     return (
       <nav className="p-4 border-b flex gap-4 items-center">
         <Link to="/">VerifyGate</Link>
         {!token && (
           <>
             <Link to="/login">Login</Link>
             <Link to="/register">Register</Link>
           </>
         )}
         {token && (
           <>
             <Link to="/devices/mine">My Devices</Link>
             <Link to="/devices/register">Register Device</Link>
             <Link to="/admin">Admin</Link>
             <Link to="/scan">Scan</Link>
             <button onClick={handleLogout} className="ml-auto text-red-600">Logout</button>
           </>
         )}
       </nav>
     );
   }

   export default Navbar;