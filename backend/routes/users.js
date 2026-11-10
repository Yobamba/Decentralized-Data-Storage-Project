import express from "express";
import db from "../db/config.js";
import { ObjectId } from "mongodb";
import swaggerJSDoc from "swagger-jsdoc";

/**
 * @openapi
 * /users:
 *   get:
 *     summary: Get all users
 *     tags:
 *       - Users
 *     responses:
 *       '200':
 *         description: A list of users
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
// return first 50 documents from users collection
router.get("/", async (req, res) => {

 const page = Number(req.query.page ?? 1);
 const limit = Number(req.query.limit ?? 50);

 if (!Number.isInteger(page) || page < 1) {
    return res.status(400).send({ error: "Invalid page parameter" });
 }
 if (!Number.isInteger(limit) || limit < 1) {
   return res.status(400).send({ error: "Invalid limit parameter" });
 }


 try {
     const results = await db.collection('users')
    .find({})
    .limit(limit)
    .skip((page - 1) * limit)
    .sort({ id: 1 })
    .toArray();
    res.status(200).send(results);

 } catch (error) {
    console.error(error);
    return res.status(500).send({ error: "Internal server error" });
 }


});
export default router;