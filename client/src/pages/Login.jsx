import { useState } from 'react';

function Login() {
    const [form, setForm] = useState({email: '', password: ''});
    const [message, setMessage] = useState('');

    const handleChange = (e) => {
        setForm({...form, [e.target.name]: e.target.value});
    }

    const handleSubmit = async() => {
        setMessage('Logging in...');
        try{
            const res = await fetch('http://localhost:5000/api/auth/login', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(form),
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Login failed');
            }

            localStorage.setItem('token', data.token);

            setMessage('Login successful!');
        }catch(err) {
            setMessage(err.message);
        }
    };

    return (
        <div className="p-8 max-w-sm mx-auto">
            <h1 className="text-xl mb-4">Login</h1>
            <input className="border p-2 w-full mb-2" name="email" placeholder="Email" onChange={handleChange} />
            <input className="border p-2 w-full mb-2" type="password" name="password" placeholder="Password" onChange={handleChange} />

            <button className="bg-black text-white p-2 w-full" onClick={handleSubmit}>Login</button>
            <p className="mt-2 text-sm">{message}</p>
        </div>
    );
}

export default Login;