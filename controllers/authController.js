const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const transporter = require("../services/emailService");
const { getSequelize } = require("../db");
const { models } = require("../models/models");
require("dotenv").config();
const {conf} = require("../app");

// Register a new user
exports.register = async (req, res) => {
  const User = models.User;
  const { firstName, lastName, email, password } = req.body;
  const username = email.split("@")[0];
  try {
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({
        message: "User with the same email already exists. try another email.",
      });
    }

    // Create new user
    const user = await User.create({
      firstName,
      lastName,
      username,
      email,
      password,
    });

    // Send verification email
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      conf.JWT_SECRET,
      {
        expiresIn: process.env.EMAIL_TOKEN_EXPIRES_IN,
      }
    );
    const verificationLink = `${process.env.BASE_URL}/auth/verify-email?token=${token}`;
    const mailOptions = {
      from: conf.EMAIL_USER,
      to: user.email,
      subject: "Verify Your Email!!!",
      html: `<p>Click <a href="${verificationLink}">here</a> to verify your email.</p>`,
    };
    await transporter.sendMail(mailOptions);

    res.status(201).json({
      message:
        "User registered. Please check your email to verify your account.",
    });
  } catch (error) {
    res.status(500).json({ message: "Error registering user" });
  }
};

// Verify email
exports.verifyEmail = async (req, res) => {
  const User = models.User;
  const { token } = req.query;

  try {
    const decoded = jwt.verify(token, conf.JWT_SECRET);
    const user = await User.findOne({ where: { id: decoded.userId } });
    if (!user) {
      return res.status(400).json({ message: "User doesn't exist" });
    }

    user.isActive = true;
    await user.save();
    res.redirect("http://localhost:5173/auth/login?email=" + user.email);
  } catch (error) {
    console.log(error);
    res.status(400).json({ message: "Invalid or expired token" });
  }
};

exports.logout = async (req, res) => {
  if (!req.user) return res.sendStatus(401);
  res.clearCookie("refreshToken");
  res.sendStatus(200);
};

// Login
exports.login = async (req, res) => {
  // const User = models.User;
  const User = models.User;
  console.log("user" + User);
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    if (!user.isActive) {
      return res
        .status(403)
        .json({ message: "Please verify your email first" });
    }

    const accessToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      conf.JWT_SECRET,
      {
        expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN,
      }
    );

    const refreshToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      conf.JWT_SECRET,
      {
        expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN,
      }
    );

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      // secure: process.env.NODE_ENV === 'production',
      secure: true,
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return res.status(200).json({
      accessToken,
      user: {
        userId: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Error logging in" });
  }
};

exports.validate = async (req, res) => {
  const User = models.User;
  // 1. Get the Authorization header
  // const authHeader = req.headers["authorization"];
  // const token = authHeader && authHeader.split(" ")[1]; // Format: "Bearer <token>"
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(403).json({ error: "Invalid token" });
    }
    const decoded = jwt.verify(refreshToken, conf.JWT_SECRET);

    const user = await User.findByPk(decoded.userId);

    if (!user) {
      return res.status(403).json({ error: "Invalid token" });
    }

    const newAccessToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      conf.JWT_SECRET,
      {
        expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN,
      }
    );

    res.json({
      accessToken: newAccessToken,
      user: {
        userId: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    });
  } catch (error) {
    console.log(error);
    // Handle different error cases
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token expired" });
    }
    if (error.name === "JsonWebTokenError") {
      return res.status(403).json({ error: "Invalid token" });
    }
    res.status(500).json({ error: "Validation failed" });
  }
};

// Refresh token endpoint
exports.refreshToken = async (req, res) => {
  const User = models.User;
  try {
    const refreshToken = req.cookies.refreshToken;
    console.log(refreshToken);
    if (!refreshToken) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    const decoded = jwt.verify(refreshToken, conf.JWT_SECRET);
    console.log(decoded);
    const user = await User.findByPk(decoded.userId);

    if (!user) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }
    console.log(user);

    const newAccessToken = jwt.sign(
      {
        userId: user.userId,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      conf.JWT_SECRET,
      {
        expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN,
      }
    );

    res.json({ accessToken: newAccessToken, user: user });
  } catch (error) {
    res.sendStatus(401);
  }
};

// Social login callback
exports.socialLogin = async (req, res) => {
  const token = jwt.sign({ userId: req.user.id }, conf.JWT_SECRET, {
    expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN,
  });

  res.status(200).json({ token });
};
