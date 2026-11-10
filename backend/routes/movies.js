import express from "express";
import db from "../db/config.js";
import { ObjectId } from "mongodb";
import swaggerJSDoc from "swagger-jsdoc";

/**
 * @openapi
 * /movies:
 *   get:
 *     summary: Get all movies
 *     tags:
 *       - Movies
 *     responses:
 *       '200':
 *         description: A list of movies
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
// return first 50 documents from movies collection
router.get("/", async (req, res, next) => {
 const page = Number(req.query.page ?? 1);
 const limit = Number(req.query.limit ?? 50);

 if (!Number.isInteger(page) || page < 1) {
   return res.status(400).send({ error: "Invalid page parameter" });
 }
 if (!Number.isInteger(limit) || limit < 1) {
   return res.status(400).send({ error: "Invalid limit parameter" });
 }


 const results = await db.collection('movies')
 .find({})
 .limit(limit)
 .skip((page - 1) * limit)
 .toArray();
 res.send(results).status(200);
});
export default router;