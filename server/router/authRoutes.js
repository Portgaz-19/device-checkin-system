const express = require("express");
const login = require("../controllers/authController").login;
const register = require("../controllers/authController").register;

const authRoutes = express.Router();

authRoutes.get('/login', login);

authRoutes.post('/register', register);


export default authRoutes;
