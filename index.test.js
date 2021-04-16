const index = require("./index"); //import file we are testing'
const app = index.app;
const mongoose = index.mongoose;
const request = require('supertest')(app); // supertest is a framework that allows to easily test web apis

describe('User session', () => {

  it('Ribbet landing page', async(done) => {
    await request.get('/')
    .expect(200)
    done()
  })

  it('Get login page', async(done) => {
    await request.get('/login')
    .expect(200)
    done()
  })

  it('Get register page', async(done) => {
    await request.get('/register')
    .expect(200)
    done()
  })

  it('Register new user', async(done) => {
    await request.post('/register')
    .type('form')
    .send({
        email: "jest@gmail.com",
        username: "jest",
        password: "jesttest"
    })
    .expect(302)
    .expect('Location', /home/)
    .then ((response) => {
      this.Cookies = response.headers['set-cookie'].pop().split(';')[0];
    })
    done()
  })

  it('Automatic login from landing page', async(done) => {
    await request.get('/');
    var req = request.get('/login')
    req.cookies = this.Cookies;
    await req
    .expect(302)
    .expect('Location', /home/)
    done()
  })

  it('Log out', async(done) => {
    await request.get('/logout')
    .expect(302)
    .expect('Location', /login/)
    done()
  })

  it('Login', async(done) => {
    await request.post('/login')
    .type('form')
    .send({
        email: "jest@gmail.com",
        password: "jesttest"
    })
    .expect(302)
    .expect('Location', /home/)
    .then ((response) => {
      this.Cookies = response.headers['set-cookie'].pop().split(';')[0];
    })
    done()
  })

  it('Get home page (logged in)', async(done) => {
    var req = request.get('/home')
    req.cookies = this.Cookies;
    await req
    .expect(200)
    done()
  })

  it('Get announcements page (logged in)', async(done) => {
    var req = request.get('/announcements')
    req.cookies = this.Cookies;
    await req
    .expect(200)
    done()
  })

  it('Get explore page (logged in)', async(done) => {
    var req = request.get('/explore')
    req.cookies = this.Cookies;
    await req
    .expect(200)
    done()
  })

  it('Get popular page (logged in)', async(done) => {
    var req = request.get('/popular')
    req.cookies = this.Cookies;
    await req
    .expect(200)
    done()
  })

  it('Get profile page (logged in)', async(done) => {
    var req = request.get('/profile')
    req.cookies = this.Cookies;
    await req
    .expect(200)
    done()
  })

  it('page does not exist', async(done) => {
    await request.get('/sdgdsfgdsfgdsf')
    .expect(404)
    done()
  })
})

afterAll(done => {
  mongoose.connection.close()
  done()
})