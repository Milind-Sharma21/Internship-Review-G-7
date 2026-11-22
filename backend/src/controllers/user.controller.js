import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse} from "../utils/ApiRespons.js"

// importing user model after database connection
// import { User} from "../models/user.model.js" 



const registerUser = asyncHandler(async (req, res) => {
    
    const registerUser = asyncHandler( async (req, res) => {
    // get user details from frontend
    // validation - not empty
    // check if user already exists: username, email
    // create user object - create entry in db
    // remove password and refresh token field from response
    // check for user creation
    // return res


    const {fullName, email, username, password } = req.body
    //console.log("email: ", email);

    if (
        [orgName, email, name, password].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required")
    }

    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists")
    }
    
   

    const user = await User.create({
        orgName,
        email, 
        password,
        orgName
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered Successfully")
    )

} )


})

// POST /api/v1/users/login
const loginUser = asyncHandler(async (req, res) => {
  // 1. get email + password
  const { email, password } = req.body
  if (!email || !password) {
    throw new ApiError(400, "Email and password are required")
  }

  // 2. find user
  const user = await User.findOne({ email: email.toLowerCase() })
  if (!user) {
    throw new ApiError(404, "User does not exist")
  }

  // 3. check password
  const isPasswordValid = await user.isPasswordCorrect(password)
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid credentials")
  }

  // 4. generate tokens
  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id)
  const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

  // 5. send cookies + response
  return res
    .status(200)
    .cookie("accessToken", accessToken, cookieOptions)
    .cookie("refreshToken", refreshToken, cookieOptions)
    .json(
      new ApiResponse(200, { user: loggedInUser, accessToken, refreshToken }, "User logged in successfully")
    )
})

// POST /api/v1/users/logout  (protected)
const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, { $unset: { refreshToken: 1 } })
  return res
    .status(200)
    .clearCookie("accessToken", cookieOptions)
    .clearCookie("refreshToken", cookieOptions)
    .json(new ApiResponse(200, {}, "User logged out"))
})

// POST /api/v1/users/refresh-token
const refreshAccessToken = asyncHandler(async (req, res) => {
  const incoming = req.cookies?.refreshToken || req.body.refreshToken
  if (!incoming) throw new ApiError(401, "Unauthorized request")

  let decoded
  try {
    decoded = jwt.verify(incoming, process.env.REFRESH_TOKEN_SECRET)
  } catch {
    throw new ApiError(401, "Invalid or expired refresh token")
  }

  const user = await User.findById(decoded._id)
  if (!user || incoming !== user.refreshToken) {
    throw new ApiError(401, "Refresh token is expired or used")
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id)
  return res
    .status(200)
    .cookie("accessToken", accessToken, cookieOptions)
    .cookie("refreshToken", refreshToken, cookieOptions)
    .json(new ApiResponse(200, { accessToken, refreshToken }, "Access token refreshed"))
})

export {registerUser, loginUser , logoutUser , refreshAccessToken}