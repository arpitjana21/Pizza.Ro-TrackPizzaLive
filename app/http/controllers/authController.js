const {User} = require('../../models/userModel');
const jwt = require('jsonwebtoken');

const signToken = function (id) {
    const secKey = process.env.JWT_SECRET;
    const expTime = process.env.JWT_EXPIRES_IN;
    return jwt.sign({id: id}, secKey, {expiresIn: expTime});
};

const createSendToken = function (user, statusCode, res) {
    const token = signToken(user._id);
    // Send Token as Cookie
    const cookieOptions = {
        expires: new Date(
            Date.now() + process.env.JWT_COOKIE_EXPIRES * 24 * 60 * 60 * 1000
        ),
        secure: true,
        httpOnly: true,
    };
    res.cookie('jwt', token, cookieOptions);
    user.password = undefined;
    return res.status(statusCode).json({
        status: 'success',
        message: 'Successfull !',
        data: {
            token: token,
            user: user,
        },
    });
};

const register = async function (req, res) {
    try {
        const newUser = await User.create({
            name: req.body.name,
            email: req.body.email,
            password: req.body.password,
            passwordConfirm: req.body.passwordConfirm,
        });
        createSendToken(newUser, 201, res);
    } catch (error) {
        res.status(400).json({
            status: 'fail',
            message: error.message,
        });
    }
};

const login = async function (req, res) {
    try {
        const {email, password} = req.body;
        // Chect User Exist & Password is CORRECT
        const user = await User.findOne({email: email}).select('+password');

        if (!user || !(await user.correctPassword(password, user.password))) {
            throw new Error('Incorrect Email or Password');
        }
        createSendToken(user, 200, res);
    } catch (error) {
        res.status(400).json({
            status: 'fail',
            message: error.message,
        });
    }
};

const logout = async function (req, res) {
    try {
        res.cookie('jwt', 'loggedout', {
            expires: new Date(Date.now() + 10 * 1000),
            httpOnly: true,
        });
        res.status(200).json({
            status: 'success',
            message: 'Logout Successful',
        });
    } catch (error) {
        res.status(400).json({
            status: 'success',
            message: error.message,
        });
    }
};

const isloggedIn = async function (req, res, next) {
    try {
        const seckey = process.env.JWT_SECRET;
        const token = req.cookies.jwt;
        if (!token) return next();

        // Verify Token
        const decoded = jwt.verify(token, seckey);

        // Check if User Still Exist
        const currentUser = await User.findById(decoded.id);
        if (!currentUser) {
            return next();
        }
        res.locals.user = currentUser;
        return next();
    } catch (error) {
        return next();
    }
};

module.exports = {register, login, isloggedIn, logout};
