const index = require("./index"); //import file we are testing'
const app = index.app;
const mongoose = index.mongoose;
const request = require('supertest')(app); // supertest is a framework that allows to easily test web apis
var session = require('supertest-session');

var testSession = null;

describe('User session', () => {

  it('Login', async(done) => {
    await request.post('/login')
    .type('form')
    .send({
        email: "user@rutgers.edu",
        password: "rutgers"
    })
    .expect(302)
    .expect('Location', /home/)
    .then ((response) => {
      this.Cookies = response.headers['set-cookie'].pop().split(';')[0];
    })
    done()
  })

  it('Load home page as logged in user', async(done) => {
    var req = request.get('/home')
    req.cookies = this.Cookies;
    await req
    .expect(200)
    done()
  })
})

afterAll(done => {
  mongoose.connection.close()
  done()
})