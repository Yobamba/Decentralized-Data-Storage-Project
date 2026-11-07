

import express from "express";
import db from "../db/config.js";
import { ObjectId } from "mongodb";
import swaggerJSDoc from "swagger-jsdoc";

/**
 * @openapi
 * /anime:
 *   get:
 *     summary: Get all anime
 *     tags:
 *       - Anime
 *     responses:
 *       '200':
 *         description: A list of anime
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   title:
 *                     type: string
 */
const router = express.Router();
// return first 50 documents from anime collection
router.get("/", async (req, res) => {
 let results = await db.collection('anime').find({})
 .limit(50)
 .toArray();
 res.send(results).status(200);
});
export default router;