import {Router } from "express"
import { userRoute } from "./userRoute.js";
export const route = Router()


route.use('/user', userRoute);
