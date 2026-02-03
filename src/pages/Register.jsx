import { Navigate } from 'react-router-dom';

function Register() {
    // /register is intentionally removed from routing.
    // Keep this component as a safety net in case something still imports it.
    return <Navigate to="/login" replace />;
}

export default Register;
