import {Routes, Route} from 'react-router-dom';
import RegisterPage from './pages/Register.jsx'
import LoginPage from './pages/Login.jsx'

function App() {
    return(
        <Routes>
            <Route path="/login" element={<LoginPage />} />

            <Route path="/register" element={<RegisterPage />} />
        </Routes>
    )
}

export default App;