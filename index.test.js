const index = require("./index"); //import file we are testing'
const should = require('should');
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

  // it('Register new user', async(done) => {
  //   await request.post('/register')
  //   .type('form')
  //   .send({
  //       email: "jest@gmail.com",
  //       username: "jest",
  //       password: "jesttest"
  //   })
  //   .expect(302)
  //   .expect('Location', /home/)
  //   .then ((response) => {
  //     this.Cookies = response.headers['set-cookie'].pop().split(';')[0];
  //   })
  //   done()
  // })

  // it('Automatic login from landing page', async(done) => {
  //   await request.get('/');
  //   var req = request.get('/login')
  //   req.cookies = this.Cookies;
  //   await req
  //   .expect(302)
  //   .expect('Location', /home/)
  //   done()
  // })

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
    // .then ((response) => {
    //   response.text.should.match(/"\/profile\/jest">Profile/);
    // })
    done()
  })

  it('Get announcements page (logged in)', async(done) => {
    var req = request.get('/announcements')
    req.cookies = this.Cookies;
    await req
    .expect(200)
    // .then ((response) => {
    //   response.text.should.match(/"\/profile\/jest">Profile/);
    // })
    done()
  })

  it('Get explore page (logged in)', async(done) => {
    var req = request.get('/explore')
    req.cookies = this.Cookies;
    await req
    .expect(200)
    // .then ((response) => {
    //   response.text.should.match(/"\/profile\/jest">Profile/);
    // })
    done()
  })

  it('Get popular page (logged in)', async(done) => {
    var req = request.get('/popular')
    req.cookies = this.Cookies;
    await req
    .expect(200)
    // .then ((response) => {
    //   response.text.should.match(/"\/profile\/jest">Profile/);
    // })
    done()
  })

  it('Get profile page (logged in)', async(done) => {
    var req = request.get('/profile')
    req.cookies = this.Cookies;
    await req
    .expect(302)
    .expect('Location', /profile/)
    done()
  })

  it('Get profile page (logged in)', async(done) => {
    var req = request.get('/profile/jest')
    req.cookies = this.Cookies;
    await req
    .expect(200)
    done()
  })

  it('Get change picture page', async(done) => {
    var req = request.get('/changePic')
    req.cookies = this.Cookies;
    await req
    .expect(200)
    done()
  })

  it('Change profile picture', async(done) => {
    var req = request.post('/changePic')
    req.cookies = this.Cookies;
    await req
    .type('form')
    .send({
        picture: "https://pbs.twimg.com/profile_images/821713465245102080/mMtKIMax.jpg",
    })
    .expect(302)
    .expect('Location', /profile/)
    done()
  })

  it('Get edit bio page', async(done) => {
    var req = request.get('/editBio')
    req.cookies = this.Cookies;
    await req
    .expect(200)
    done()
  })

  it('Edit bio', async(done) => {
    var req = request.post('/editBio')
    req.cookies = this.Cookies;
    await req
    .type('form')
    .send({
        bio: "I am a test user",
    })
    .expect(302)
    .expect('Location', /profile\/jest/)
    done()
  })

  it('Get followers page', async(done) => {
    var req = request.post('/followers/jest')
    req.cookies = this.Cookies;
    await req
    .expect(200)
    done()
  })

  it('Get following page', async(done) => {
    var req = request.post('/following/jest')
    req.cookies = this.Cookies;
    await req
    .expect(200)
    done()
  })

  it('Make post', async(done) => {
    var req = request.post('/makePost')
    req.cookies = this.Cookies;
    await req
    .type('form')
    .send({
        username: "jest",
        postContent: "Testing a new posts on this site",
        interest: "Soccer",
        addInterest: "testing"
    })
    .expect(302)
    .expect('Location', /profile/)
    done()
  })

  it('page does not exist', async(done) => {
    await request.get('/sdgdsfgdsfgdsf')
    .expect(404)
    done()
  })

  it('Get edit interest page', async(done) => {
    var req = request.get('/editInterests')
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