import {Router } from "express"
import { zoneRoute } from "./zoneRoute.js";
import { workspaceRoute } from "./workspaceRoute.js";
import { turnRoute } from "./turnRoute.js";
import { sessionRoute } from "./sessionRoute.js";
import chatRoute from "./chatRoute.js";
export const route = Router()


route.use('/workspaces', workspaceRoute)
route.use('/turn', turnRoute)
route.use('/sessions', sessionRoute)
route.use('/chat', chatRoute)
