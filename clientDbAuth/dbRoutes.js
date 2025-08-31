//user will have to save their credentials in the my db collection.
// once get it in server then encrypt based on very good algorithm
// when user want to use connect to db then decrypt the credentials and use it.
// user can also change the db credentials.
// user can also delete the db credentials.
// user can also view the db credentials.


import express from 'express';
import ClientDatabase from './dbService.js';
const route = express.Router();
const clientDatabase = new ClientDatabase();
//imp MIDDLEWARE to verify the token from auth folder and also need to refactor the code -- ***********

route.post('/db', clientDatabase.saveDBCredentials.bind(clientDatabase));
route.get('/db', clientDatabase.getDBCredentials.bind(clientDatabase));
route.delete('/db', clientDatabase.deleteDBCredentials.bind(clientDatabase));

export default route;