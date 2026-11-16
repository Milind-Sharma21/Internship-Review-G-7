import { asyncHandler } from "../utils/asyncHandler.js"


const registerUser = asyncHandler(async (req, res) => {
    // console.log("hello")
    // res.status(200).json({ message: 'User registered successfully' })

    const { orgName , name , email , password } = req.body 
    console.log("email : " , email )

})

export {registerUser}