import express from 'express'
import movies from "./routes/movies.js";
// import users from "./routes/users.js";
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './swagger.js';

const app = express()
const port = 3000

app.get('/swagger.json', (req, res) => {
  res.json(swaggerSpec);
});

app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec)
);



app.use(express.json());
// Load the /movies routes
app.use("/movies", movies);
// Load the /users routes
// app.use("/users", users);
app.listen(port, () => {
 console.log(`backend listening on port ${port}`)
})