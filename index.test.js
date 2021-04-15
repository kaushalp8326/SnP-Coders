const app = require("./index"); //import file we are testing
const request = require("supertest"); // supertest is a framework that allows to easily test web apis




test("Logs in a valid user", async () => {
  await request(app).post('/login')
  .send({
      email: "user@rutgers.edu",
      password: "rutgers"
  })
  .expect(200)

})

test("Log in an invalid user", async () => {
  await request(app).post('/login')
  .send({
      email: "user123123@rutgers.edu",
      password: "rutgers1111"
  })
  .expect(200)
})