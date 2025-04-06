const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const { User } = require("../models/models");
require("dotenv").config();

module.exports = (passport) => {
  // Google OAuth
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: `${process.env.BASE_URL}/auth/google/callback`,
      },
      async (accessToken, refreshToken, profile, done) => {
        const email = profile.emails[0].value;
        const firstName = profile.name.givenName;
        const lastName = profile.name.familyName;
        const username = email.split("@")[0]; // Use email prefix as username

        let user = await User.findOne({ where: { email } });

        if (!user) {
          user = await User.create({
            firstName,
            lastName,
            username,
            email,
            googleId: profile.id,
            isActive: true,
          });
        }

        done(null, user);
      }
    )
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id, done) => {
    const user = await User.findByPk(id);
    done(null, user);
  });
};
