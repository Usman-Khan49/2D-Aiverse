import {Router } from "express"
import { zoneRoute } from "./zoneRoute.js";
import { workspaceRoute } from "./workspaceRoute.js";
export const route = Router()


route.use('/workspaces', workspaceRoute)
