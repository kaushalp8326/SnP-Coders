const index = require("./index"); //import file we are testing'
const app = index.app;
const mongoose = index.mongoose;
const request = require('supertest')(app); // supertest is a framework that allows to easily test web apis

test("Logs in a valid user", async (done) => {
  await request.post('/login')
  .type('form')
  .send({
      email: "user@rutgers.edu",
      password: "rutgers"
  })
  .expect(302)
  .expect('Location', /home/)
  done()
})

afterAll(done => {
  mongoose.connection.close()
  done()
})