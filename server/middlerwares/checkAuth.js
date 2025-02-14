const RESPONSE = require('../utils/constantResponse');
const User = require('../models/user');
const {
  getAccessToken,
  getRefreshToken,
  getUserNameToken,
  verifyToken,
  getCookieOptions,
} = require('../utils/auth');

// secret keys and secret times
/* eslint-disable */
const [ACCESS_SECRET_KEY, REFRESH_SECRET_KEY] = [
  process.env.ACCESS_SECRET_KEY || secrets.ACCESS_SECRET_KEY,
  process.env.REFRESH_SECRET_KEY || secrets.REFRESH_SECRET_KEY,
];

// check if the user has logged in before using the services
module.exports = async (req, res, next) => {
  try {
    // bearer token
    let token = req.headers.authorization.split(' ')[1];
    // get the cookies
    const refreshToken = req.cookies._coderoyale_rtk;
    let userName = req.cookies._coderoyale_un;
    let payload;

    // username is stored signed with JWT_KEY
    try {
      userName = verifyToken(userName, ACCESS_SECRET_KEY).userName;
    } catch (err) {
      // console.log("UserToken", err);
      throw new Error('Token Not Provided');
    }
    // verify accessToken  with server
    try {
      payload = verifyToken(token, ACCESS_SECRET_KEY + userName);
    } catch (err) {
      if (err !== 'jwt expired') {
        // console.log("AccessToken", err);
        res.clearCookie('_coderoyale_rtk');
        res.clearCookie('_coderoyale_un');
        throw new Error('Token Man Handled');
      }
    }

    // if accessToken verify failed
    if (!payload) {
      const user = await User.findOne({ userName: userName });

      // check for the refreshtoken
      payload = verifyToken(
        refreshToken,
        process.env.REFRESH_SECRET_KEY + user.password
      );

      // the access and refresh token failed
      if (!payload) {
        throw new Error('Auth Failed');
      }

      // if the refreshJwtToken worked so set new tokens
      token = getAccessToken(user);
      res.cookie(
        '_coderoyale_rtk',
        getRefreshToken(user),
        getCookieOptions(604800000)
      );
      res.cookie(
        '_coderoyale_un',
        getUserNameToken(user),
        getCookieOptions(604800000)
      );
    }

    // pass accessToken
    req.accessToken = token;

    // returning the payload
    req.payload = payload;

    // continue the control-flow of the code or call the next middleware
    next();
  } catch (error) {
    // token was expired or user had made changes in the token
    // console.log(error);
    res.status(401).json({
      status: false,
      payload: {
        message: RESPONSE.AUTHERROR,
      },
    });
  }
};

/* eslint-enable */
