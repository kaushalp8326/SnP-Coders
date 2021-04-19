const index = require("./index"); //import file we are testing'
const should = require('should');
const app = index.app;
const mongoose = index.mongoose;
const request = require('supertest')(app); // supertest is a framework that allows to easily test web apis
const User = index.User;
const Post = index.Post;
const Interest = index.Interest;

// /like/postId/607c7801f13d0f9d4c5d23b2

beforeAll(async (done) => {
    await User.deleteOne({ email: 'jestEmail@gmail.com', username: 'jestUsername' })
    await Post.findOne({ text: 'Test post for likes and dislikes' }, (function (error, foundPost) {
        foundPost.likes = []
        foundPost.dislikes = []
        foundPost.save()
    }))
    await Post.deleteOne({ text: 'Testing a new posts on this site' })
    done()
})

describe('T01', () => {

    it('Get the registration page', async (done) => {
        await request.get('/register')
            .send({
                email: "",
                username: "jestUsername",
                password: "jestPassword"
            })
            .expect(200)
            .then((response) => {
                response.text.should.match(/Register Now/)
            })
        done()
    })

    it('Tell user there is no entered email', async (done) => {
        await request.post('/register')
            .type('form')
            .send({
                email: "",
                username: "jestUsername",
                password: "jestPassword"
            })
            .expect(406)
            .then((response) => {
                response.text.should.match(/Please enter an email./)
            })
        done()
    })

    it('Tell user there is no entered username', async (done) => {
        await request.post('/register')
            .type('form')
            .send({
                email: "jestEmail@gmail.com",
                username: "",
                password: "jestPassword"
            })
            .expect(406)
            .then((response) => {
                response.text.should.match(/Please enter a username./)
            })
        done()
    })

    it('Tell user there is no entered password', async (done) => {
        await request.post('/register')
            .type('form')
            .send({
                email: "jestEmail@gmail.com",
                username: "jestUsername",
                password: ""
            })
            .expect(406)
            .then((response) => {
                response.text.should.match(/Please enter a password./)
            })
        done()
    })

    it('Tell user the entered email is taken', async (done) => {
        await request.post('/register')
            .type('form')
            .send({
                email: "takenEmail@gmail.com",
                username: "jestUsername",
                password: "jestPassword"
            })
            .expect(406)
            .then((response) => {
                response.text.should.match(/Email is already taken. <br>/)
            })
        done()
    })

    it('Tell user the entered username is taken', async (done) => {
        await request.post('/register')
            .type('form')
            .send({
                email: "jestEmail@gmail.com",
                username: "takenUsername",
                password: "jestPassword"
            })
            .expect(406)
            .then((response) => {
                response.text.should.match(/Username is already taken. <br>/)
            })
        done()
    })

    it('Enter new user in database, start user session, redirect to home page', async (done) => {
        await request.post('/register')
            .type('form')
            .send({
                email: "jestEmail@gmail.com",
                username: "jestUsername",
                password: "jestPassword"
            })
            .expect(302)
            .expect("Location", "/home")
            .then((response) => {
                this.Cookies = response.headers['set-cookie'].pop().split(';')[0];
            })
        const foundUser = await User.findOne({ email: "jestEmail@gmail.com", username: "jestUsername" })
        expect(foundUser).toBeTruthy()
        done()
    })

})

describe('T02', () => {

    beforeEach(async (done) => {
        await request.post('/login')
            .type('form')
            .send({
                email: "jestEmail@gmail.com",
                password: "jestPassword"
            })
            .then((response) => {
                this.Cookies = response.headers['set-cookie'].pop().split(';')[0];
            })
        done()
    })

    it('Get the explore page', async (done) => {
        var req = request.get('/explore')
        req.cookies = this.Cookies
        await req
            .expect(200)
            .then((response) => {
                response.text.should.match(/Find people who share your Interests/)
            })
        done()
    })

    it('Get the page of a site user', async (done) => {
        var req = request.get('/profile/takenUsername')
        req.cookies = this.Cookies
        await req
            .expect(200)
            .then((response) => {
                response.text.should.match(/takenUsername's Profile/)
            })
        done()
    })

    it('Unfollow a user that you have not followed', async (done) => {
        var user = await User.findOne({ username: "jestUsername" })
        var otherUser = await User.findOne({ username: "takenUsername" })
        expect(user.following.includes("takenUsername")).toBeFalsy()
        expect(otherUser.followers.includes("jestUsername")).toBeFalsy()
        var req = request.get('/unfollow/username/takenUsername')
        req.cookies = this.Cookies
        await req
            .expect(302)
        user = await User.findOne({ username: "jestUsername" })
        otherUser = await User.findOne({ username: "takenUsername" })
        expect(user.following.includes("takenUsername")).toBeFalsy()
        expect(otherUser.followers.includes("jestUsername")).toBeFalsy()
        done()
    })

    it('Follow a user that you have not followed', async (done) => {
        var user = await User.findOne({ username: "jestUsername" })
        var otherUser = await User.findOne({ username: "takenUsername" })
        expect(user.following.includes("takenUsername")).toBeFalsy()
        expect(otherUser.followers.includes("jestUsername")).toBeFalsy()
        var req = request.get('/follow/username/takenUsername')
        req.cookies = this.Cookies
        await req
            .expect(302)
        user = await User.findOne({ username: "jestUsername" })
        otherUser = await User.findOne({ username: "takenUsername" })
        expect(user.following.includes("takenUsername")).toBeTruthy()
        expect(otherUser.followers.includes("jestUsername")).toBeTruthy()
        done()
    })

    it('See post of followed user on home page', async (done) => {
        var posts = await Post.find({author: "takenUsername"})
        var req = request.get('/home')
        req.cookies = this.Cookies
        await req
            .expect(200)
            .then((response) => {
                for (let post of posts) {
                    expect(response.text.includes(post._id)).toBeTruthy()
                }
            })
        done()
    })

    it('Follow a user that you have already followed', async (done) => {
        var user = await User.findOne({ username: "jestUsername" })
        var otherUser = await User.findOne({ username: "takenUsername" })
        expect(user.following.includes("takenUsername")).toBeTruthy()
        expect(otherUser.followers.includes("jestUsername")).toBeTruthy()
        var req = request.get('/follow/username/takenUsername')
        req.cookies = this.Cookies
        await req
            .expect(302)
        user = await User.findOne({ username: "jestUsername" })
        otherUser = await User.findOne({ username: "takenUsername" })
        expect(user.following.includes("takenUsername")).toBeTruthy()
        expect(otherUser.followers.includes("jestUsername")).toBeTruthy()
        done()
    })

    it('Unfollow a user that you have followed', async (done) => {
        var user = await User.findOne({ username: "jestUsername" })
        var otherUser = await User.findOne({ username: "takenUsername" })
        expect(user.following.includes("takenUsername")).toBeTruthy()
        expect(otherUser.followers.includes("jestUsername")).toBeTruthy()
        var req = request.get('/unfollow/username/takenUsername')
        req.cookies = this.Cookies
        await req
            .expect(302)
        user = await User.findOne({ username: "jestUsername" })
        otherUser = await User.findOne({ username: "takenUsername" })
        expect(user.following.includes("takenUsername")).toBeFalsy()
        expect(otherUser.followers.includes("jestUsername")).toBeFalsy()
        done()
    })

    it('Do not see post of unfollowed user on home page', async (done) => {
        var posts = await Post.find({author: "takenUsername"})
        var req = request.get('/home')
        req.cookies = this.Cookies
        await req
            .expect(200)
            .then((response) => {
                for (let post of posts) {
                    expect(response.text.includes(post._id)).toBeFalsy()
                }
            })
        done()
    })
})

describe('T03', () => {

    beforeEach(async (done) => {
        await request.post('/login')
            .type('form')
            .send({
                email: "jestEmail@gmail.com",
                password: "jestPassword"
            })
            .then((response) => {
                this.Cookies = response.headers['set-cookie'].pop().split(';')[0];
            })
        done()
    })

    it('Unlike a post that you have not liked', async (done) => {
        var foundPost = await Post.findOne({ text: "Test post for likes and dislikes" })
        expect(foundPost.likes.includes("jestUsername")).toBeFalsy()
        numberOfLikes = foundPost.likes.length
        var req = request.get('/unlike/postId/' + foundPost._id)
        req.cookies = this.Cookies
        await req
            .expect(302)
        foundPost = await Post.findOne({ text: "Test post for likes and dislikes" })
        expect(foundPost.likes.includes("jestUsername")).toBeFalsy()
        expect(foundPost.likes.length).toBe(numberOfLikes)
        done()
    })

    it('Like a post that you have not liked', async (done) => {
        var foundPost = await Post.findOne({ text: "Test post for likes and dislikes" })
        expect(foundPost.likes.includes("jestUsername")).toBeFalsy()
        numberOfLikes = foundPost.likes.length
        var req = request.get('/like/postId/' + foundPost._id)
        req.cookies = this.Cookies
        await req
            .expect(302)
        foundPost = await Post.findOne({ text: "Test post for likes and dislikes" })
        expect(foundPost.likes.includes("jestUsername")).toBeTruthy()
        expect(foundPost.likes.length).toBe(numberOfLikes + 1)
        done()
    })

    it('Like a post that you have already liked', async (done) => {
        var foundPost = await Post.findOne({ text: "Test post for likes and dislikes" })
        expect(foundPost.likes.includes("jestUsername")).toBeTruthy()
        numberOfLikes = foundPost.likes.length
        var req = request.get('/like/postId/' + foundPost._id)
        req.cookies = this.Cookies
        await req
            .expect(302)
        foundPost = await Post.findOne({ text: "Test post for likes and dislikes" })
        expect(foundPost.likes.includes("jestUsername")).toBeTruthy()
        expect(foundPost.likes.length).toBe(numberOfLikes)
        done()
    })

    it('Unlike a post that you have liked', async (done) => {
        var foundPost = await Post.findOne({ text: "Test post for likes and dislikes" })
        expect(foundPost.likes.includes("jestUsername")).toBeTruthy()
        numberOfLikes = foundPost.likes.length
        var req = request.get('/unlike/postId/' + foundPost._id)
        req.cookies = this.Cookies
        await req
            .expect(302)
        foundPost = await Post.findOne({ text: "Test post for likes and dislikes" })
        expect(foundPost.likes.includes("jestUsername")).toBeFalsy()
        expect(foundPost.likes.length).toBe(numberOfLikes - 1)
        done()
    })

    it('Undislike a post that you have not disliked', async (done) => {
        var foundPost = await Post.findOne({ text: "Test post for likes and dislikes" })
        expect(foundPost.dislikes.includes("jestUsername")).toBeFalsy()
        numberOfDislikes = foundPost.dislikes.length
        var req = request.get('/undislike/postId/' + foundPost._id)
        req.cookies = this.Cookies
        await req
            .expect(302)
        foundPost = await Post.findOne({ text: "Test post for likes and dislikes" })
        expect(foundPost.dislikes.includes("jestUsername")).toBeFalsy()
        expect(foundPost.dislikes.length).toBe(numberOfDislikes)
        done()
    })

    it('Dislike a post that you have not disliked', async (done) => {
        var foundPost = await Post.findOne({ text: "Test post for likes and dislikes" })
        expect(foundPost.dislikes.includes("jestUsername")).toBeFalsy()
        numberOfDislikes = foundPost.dislikes.length
        var req = request.get('/dislike/postId/' + foundPost._id)
        req.cookies = this.Cookies
        await req
            .expect(302)
        foundPost = await Post.findOne({ text: "Test post for likes and dislikes" })
        expect(foundPost.dislikes.includes("jestUsername")).toBeTruthy()
        expect(foundPost.dislikes.length).toBe(numberOfDislikes + 1)
        done()
    })

    it('Dislike a post that you have already disliked', async (done) => {
        var foundPost = await Post.findOne({ text: "Test post for likes and dislikes" })
        expect(foundPost.dislikes.includes("jestUsername")).toBeTruthy()
        numberOfDislikes = foundPost.dislikes.length
        var req = request.get('/dislike/postId/' + foundPost._id)
        req.cookies = this.Cookies
        await req
            .expect(302)
        foundPost = await Post.findOne({ text: "Test post for likes and dislikes" })
        expect(foundPost.dislikes.includes("jestUsername")).toBeTruthy()
        expect(foundPost.dislikes.length).toBe(numberOfDislikes)
        done()
    })

    it('Undislike a post that you have disliked', async (done) => {
        var foundPost = await Post.findOne({ text: "Test post for likes and dislikes" })
        expect(foundPost.dislikes.includes("jestUsername")).toBeTruthy()
        numberOfDislikes = foundPost.dislikes.length
        var req = request.get('/undislike/postId/' + foundPost._id)
        req.cookies = this.Cookies
        await req
            .expect(302)
        foundPost = await Post.findOne({ text: "Test post for likes and dislikes" })
        expect(foundPost.dislikes.includes("jestUsername")).toBeFalsy()
        expect(foundPost.dislikes.length).toBe(numberOfDislikes - 1)
        done()
    })

    it('Dislike a post that you have liked', async (done) => {
        var foundPost = await Post.findOne({ text: "Test post for likes and dislikes" })
        var req = request.get('/like/postId/' + foundPost._id)
        req.cookies = this.Cookies
        await req
            .expect(302)
        foundPost = await Post.findOne({ text: "Test post for likes and dislikes" })
        expect(foundPost.likes.includes("jestUsername")).toBeTruthy()
        expect(foundPost.dislikes.includes("jestUsername")).toBeFalsy()
        numberOfLikes = foundPost.likes.length
        numberOfDislikes = foundPost.dislikes.length
        var req = request.get('/dislike/postId/' + foundPost._id)
        req.cookies = this.Cookies
        await req
            .expect(302)
        foundPost = await Post.findOne({ text: "Test post for likes and dislikes" })
        expect(foundPost.likes.includes("jestUsername")).toBeFalsy()
        expect(foundPost.dislikes.includes("jestUsername")).toBeTruthy()
        expect(foundPost.likes.length).toBe(numberOfLikes - 1)
        expect(foundPost.dislikes.length).toBe(numberOfDislikes + 1)
        done()
    })

    it('Like a post that you have disliked', async (done) => {
        var foundPost = await Post.findOne({ text: "Test post for likes and dislikes" })
        var req = request.get('/dislike/postId/' + foundPost._id)
        req.cookies = this.Cookies
        await req
            .expect(302)
        foundPost = await Post.findOne({ text: "Test post for likes and dislikes" })
        expect(foundPost.likes.includes("jestUsername")).toBeFalsy()
        expect(foundPost.dislikes.includes("jestUsername")).toBeTruthy()
        numberOfLikes = foundPost.likes.length
        numberOfDislikes = foundPost.dislikes.length
        var req = request.get('/like/postId/' + foundPost._id)
        req.cookies = this.Cookies
        await req
            .expect(302)
        foundPost = await Post.findOne({ text: "Test post for likes and dislikes" })
        expect(foundPost.likes.includes("jestUsername")).toBeTruthy()
        expect(foundPost.dislikes.includes("jestUsername")).toBeFalsy()
        expect(foundPost.likes.length).toBe(numberOfLikes + 1)
        expect(foundPost.dislikes.length).toBe(numberOfDislikes - 1)
        done()
    })

})

describe('IN-01-04', () => {

    it('Report post without login', async (done) => {
        await request.get('/report/postId/607c7801f13d0f9d4c5d23b2')
            .expect(401);
        done();
    });

    it('Login', async (done) => {
        await request.post('/login')
            .type('form')
            .send({
                email: "jest@gmail.com",
                password: "jesttest"
            })
            .expect(302)
            .expect('Location', /home/)
            .then((response) => {
                this.Cookies = response.headers['set-cookie'].pop().split(';')[0];
            });
        done();
    });

    it('Report invalid post', async (done) => {
        var req = request.get('/report/postId/assssddadadaad');
        req.cookies = this.Cookies;
        await req
            .expect(400);
        done();
    });

    it("Report post", async (done) => {
        var req = request.get('/report/postId/607c7801f13d0f9d4c5d23b2')
        req.cookies = this.Cookies;
        await req
            .expect(302)
        done();
    });

    it("Check if reported post shows up in admin", async (done) => {
        Post.findOne({ _id: mongoose.Types.ObjectId('607c7801f13d0f9d4c5d23b2') }, function (error, foundPost) {
            if (error) {
                console.log(error);
                done();
            } else {
                if (foundPost) {
                    expect(foundPost.isReported).toBe(true);
                }
                done();
            }
        });
    })

    it('Log out', async (done) => {
        await request.get('/logout')
            .expect(302)
            .expect('Location', /login/);
        done();
    });

});

describe('OU-01-01', () => {

    it('Login', async (done) => {
        await request.post('/login')
            .type('form')
            .send({
                email: "jest@gmail.com",
                password: "jesttest"
            })
            .expect(302)
            .expect('Location', /home/)
            .then((response) => {
                this.Cookies = response.headers['set-cookie'].pop().split(';')[0];
            });
        done();
    });

    it("Check timeline", async (done) => {
        var req = request.get('/home')
        req.cookies = this.Cookies;
        await req
            .expect(200)
            .then((response) => {
                User.findOne({ username: "jest" }, function (error, foundUser) {
                    if (error) {
                        console.log(error);
                        done();
                    } else {
                        Post.find({ isVisible: true, author: { $in: foundUser.following } }).exec(function (findPostError, foundPosts) {
                            if (findPostError) {
                                console.log(findPostError);
                                done();
                            } else {
                                if (foundPosts) {
                                    for (let post of foundPosts) {
                                        expect(response.text.includes(post._id)).toBe(true);
                                    }
                                }
                                done();
                            }
                        })
                    }
                });

            });
    });

    it('Log out', async (done) => {
        await request.get('/logout')
            .expect(302)
            .expect('Location', /login/);
        done();
    });

});

describe('PR-01-01', () => {

    it('Like post without login', async (done) => {
        await request.get('/like/postId/607c7801f13d0f9d4c5d23b2')
            .expect(401);
        done();
    });

    it('Dislike post without login', async (done) => {
        await request.get('/dislike/postId/607c7801f13d0f9d4c5d23b2')
            .expect(401);
        done();
    });

    it('Unlike post without login', async (done) => {
        await request.get('/unlike/postId/607c7801f13d0f9d4c5d23b2')
            .expect(401);
        done();
    });

    it('Undislike post without login', async (done) => {
        await request.get('/undislike/postId/607c7801f13d0f9d4c5d23b2')
            .expect(401);
        done();
    });

    it('Login', async (done) => {
        await request.post('/login')
            .type('form')
            .send({
                email: "jest@gmail.com",
                password: "jesttest"
            })
            .expect(302)
            .expect('Location', /home/)
            .then((response) => {
                this.Cookies = response.headers['set-cookie'].pop().split(';')[0];
            });
        done();
    });

    it('Like with invalid post', async (done) => {
        var req = request.get('/like/postId/assssddadadaad');
        req.cookies = this.Cookies;
        await req
            .expect(400);
        done();
    });

    it('Dislike with invalid post', async (done) => {
        var req = request.get('/dislike/postId/assssddadadaad');
        req.cookies = this.Cookies;
        await req
            .expect(400);
        done();
    });

    it('Unlike with invalid post', async (done) => {
        var req = request.get('/unlike/postId/assssddadadaad');
        req.cookies = this.Cookies;
        await req
            .expect(400);
        done();
    });

    it('Undislike with invalid post', async (done) => {
        var req = request.get('/undislike/postId/assssddadadaad');
        req.cookies = this.Cookies;
        await req
            .expect(400);
        done();
    });

    it('Like post', async (done) => {
        var req = request.get('/like/postId/607c7801f13d0f9d4c5d23b2');
        req.cookies = this.Cookies;
        await req
            .expect(302);
        done();
    });

    it('Check if karma updated after like', async (done) => {
        Post.findOne({ _id: mongoose.Types.ObjectId('607c7801f13d0f9d4c5d23b2') }, function (findPostError, foundPost) {
            if (findPostError) {
                console.log(findPostError);
            } else {
                if (foundPost) {
                    expect(foundPost.likes.includes('jest')).toBe(true);
                    expect(foundPost.dislikes.includes('jest')).toBe(false);
                }
            }
            done();
        })
    });

    it('Dislike post', async (done) => {
        var req = request.get('/dislike/postId/607c7801f13d0f9d4c5d23b2');
        req.cookies = this.Cookies;
        await req
            .expect(302);
        done();
    });

    it('Check if karma updated after dislike', async (done) => {
        Post.findOne({ _id: mongoose.Types.ObjectId('607c7801f13d0f9d4c5d23b2') }, function (findPostError, foundPost) {
            if (findPostError) {
                console.log(findPostError);
            } else {
                if (foundPost) {
                    expect(foundPost.likes.includes('jest')).toBe(false);
                    expect(foundPost.dislikes.includes('jest')).toBe(true);
                }
            }
            done();
        })
    });

    it('Unlike post', async (done) => {
        var req = request.get('/like/postId/607c7801f13d0f9d4c5d23b2');
        req.cookies = this.Cookies;
        await req
            .expect(302);

        req = request.get('/unlike/postId/607c7801f13d0f9d4c5d23b2');
        req.cookies = this.Cookies;
        await req
            .expect(302);
        done();
    });

    it('Check if karma updated after unlike', async (done) => {
        Post.findOne({ _id: mongoose.Types.ObjectId('607c7801f13d0f9d4c5d23b2') }, function (findPostError, foundPost) {
            if (findPostError) {
                console.log(findPostError);
            } else {
                if (foundPost) {
                    expect(foundPost.likes.includes('jest')).toBe(false);
                }
            }
            done();
        })
    });

    it('Undislike post', async (done) => {
        var req = request.get('/dislike/postId/607c7801f13d0f9d4c5d23b2');
        req.cookies = this.Cookies;
        await req
            .expect(302);

        req = request.get('/undislike/postId/607c7801f13d0f9d4c5d23b2');
        req.cookies = this.Cookies;
        await req
            .expect(302);
        done();
    });

    it('Check if karma updated after undislike', async (done) => {
        Post.findOne({ _id: mongoose.Types.ObjectId('607c7801f13d0f9d4c5d23b2') }, function (findPostError, foundPost) {
            if (findPostError) {
                console.log(findPostError);
            } else {
                if (foundPost) {
                    expect(foundPost.dislikes.includes('jest')).toBe(false);
                }
            }
            done();
        })
    });

    it('Log out', async (done) => {
        await request.get('/logout')
            .expect(302)
            .expect('Location', /login/);
        done();
    });

});

describe('T08', () => {

    it('Login admin', async (done) => {
        await request.post('/login')
            .type('form')
            .send({
                email: "jestAdmin@gmail.com",
                password: "jestAdmin"
            })
            .expect(302)
            .expect('Location', /home/)
            .then((response) => {
                this.Cookies = response.headers['set-cookie'].pop().split(';')[0];
            })
        done()
    });

    it('Admin bans user', async (done) => {
        var req = request.get('/ban/username/jestBan');
        req.cookies = this.Cookies;
        await req
            .expect(302);
        User.findOne({username: "jestBan"}, function(error, foundUser) {
            if(error){
                console.log(error);
            }else{
                expect(foundUser.isBanned).toBe(true);
            }
        });
        done();
    });

    it('Admin unbans user', async (done) => {
        var req = request.get('/unban/username/jestBan');
        req.cookies = this.Cookies;
        await req
            .expect(302);
        User.findOne({username: "jestBan"}, function(error, foundUser) {
            if(error){
                console.log(error);
            }else{
                expect(foundUser.isBanned).toBe(false);
            }
        });
        done();
    });

    it('Log out', async (done) => {
        await request.get('/logout')
            .expect(302)
            .expect('Location', /login/);
        done();
    });

    it('Login regular user', async (done) => {
        await request.post('/login')
            .type('form')
            .send({
                email: "jest@gmail.com",
                password: "jesttest"
            })
            .expect(302)
            .expect('Location', /home/)
            .then((response) => {
                this.Cookies = response.headers['set-cookie'].pop().split(';')[0];
            })
        done()
    });

    it('Regular user attempts to ban user', async (done) => {
        var req = request.get('/ban/username/jestBan');
        req.cookies = this.Cookies;
        await req
            .expect(403);
        done();
    });

    it('Regular user attempts to unban user', async (done) => {
        var req = request.get('/ban/username/jestBan');
        req.cookies = this.Cookies;
        await req
            .expect(403);
        done();
    });

    it('Log out', async (done) => {
        await request.get('/logout')
            .expect(302)
            .expect('Location', /login/);
        done();
    });

});

describe('T09', () => {

    it('Login', async (done) => {
        await request.post('/login')
            .type('form')
            .send({
                email: "jest@gmail.com",
                password: "jesttest"
            })
            .expect(302)
            .expect('Location', /home/)
            .then((response) => {
                this.Cookies = response.headers['set-cookie'].pop().split(';')[0];
            });
        done();
    });

    it("get search results", async (done) => {
        var posts = await Post.find({$text: {$search: "DNA"}, author: {$ne: "jest"}, isVisible: true}, {score: {$meta: "textScore"}}).sort({score: {$meta: "textScore"}});
        var req = request.post('/searchPost');
        req.cookies = this.Cookies;
        await req
            .type('form')
            .send({
                keywords: "DNA",
            })
            .expect(200)
            .then((response) => {
                for(post of posts) {
                    expect(response.text.includes(post.text)).toBeTruthy();
                }
            });
        done();
    });

});

describe('T10', () => {

    it('Login admin', async (done) => {
        await request.post('/login')
            .type('form')
            .send({
                email: "jestAdmin@gmail.com",
                password: "jestAdmin"
            })
            .expect(302)
            .expect('Location', /home/)
            .then((response) => {
                this.Cookies = response.headers['set-cookie'].pop().split(';')[0];
            })
        done()
    });

    it("Check if admin can view reported posts", async (done) => {
        var posts = await Post.find({isReported: true}).sort({date: -1});
        var req = request.get('/viewReportedPosts');
        req.cookies = this.Cookies;
        await req
            .expect(200)
            .then((response) => {
                for(post of posts) {
                    expect(response.text.includes(post._id)).toBeTruthy();
                }
            });
        done();
    });

    it('Log out', async (done) => {
        await request.get('/logout')
            .expect(302)
            .expect('Location', /login/);
        done();
    });

    it('Login regular user', async (done) => {
        await request.post('/login')
            .type('form')
            .send({
                email: "jest@gmail.com",
                password: "jesttest"
            })
            .expect(302)
            .expect('Location', /home/)
            .then((response) => {
                this.Cookies = response.headers['set-cookie'].pop().split(';')[0];
            })
        done()
    });

    it('Regular user attempts to view reported posts', async (done) => {
        var req = request.get('/viewReportedPosts');
        req.cookies = this.Cookies;
        await req
            .expect(403);
        done();
    });

});

describe('User session', () => {

    it('Ribbet landing page', async (done) => {
        await request.get('/')
            .expect(200)
        done()
    })

    it('Get login page', async (done) => {
        await request.get('/login')
            .expect(200)
        done()
    })

    it('Get register page', async (done) => {
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

    it('Log out', async (done) => {
        await request.get('/logout')
            .expect(302)
            .expect('Location', /login/);
        done();
    });

    it('Login', async (done) => {
        await request.post('/login')
            .type('form')
            .send({
                email: "jest@gmail.com",
                password: "jesttest"
            })
            .expect(302)
            .expect('Location', /home/)
            .then((response) => {
                this.Cookies = response.headers['set-cookie'].pop().split(';')[0];
            })
        done()
    })

    it('Get home page (logged in)', async (done) => {
        var req = request.get('/home')
        req.cookies = this.Cookies;
        await req
            .expect(200)
        // .then ((response) => {
        //   response.text.should.match(/"\/profile\/jest">Profile/);
        // })
        done()
    })

    it('Get announcements page (logged in)', async (done) => {
        var req = request.get('/announcements')
        req.cookies = this.Cookies;
        await req
            .expect(200)
        // .then ((response) => {
        //   response.text.should.match(/We will be banning all users who are not cool/);
        // })
        done()
    })

    it('Get explore page (logged in)', async (done) => {
        var req = request.get('/explore')
        req.cookies = this.Cookies;
        await req
            .expect(200)
        // .then ((response) => {
        //   response.text.should.match(/"\/profile\/jest">Profile/);
        // })
        done()
    })

    it('Get popular page (logged in)', async (done) => {
        var req = request.get('/popular')
        req.cookies = this.Cookies;
        await req
            .expect(200)
        // .then ((response) => {
        //   response.text.should.match(/"\/profile\/jest">Profile/);
        // })
        done()
    })

    it('Get profile page (logged in)', async (done) => {
        var req = request.get('/profile')
        req.cookies = this.Cookies;
        await req
            .expect(302)
            .expect('Location', /profile/)
        done()
    })

    it('Get profile page (logged in)', async (done) => {
        var req = request.get('/profile/jest')
        req.cookies = this.Cookies;
        await req
            .expect(200)
        done()
    })

    it('Get change picture page', async (done) => {
        var req = request.get('/changePic')
        req.cookies = this.Cookies;
        await req
            .expect(200)
        done()
    })

    it('Change profile picture', async (done) => {
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

    it('Get edit bio page', async (done) => {
        var req = request.get('/editBio')
        req.cookies = this.Cookies;
        await req
            .expect(200)
        done()
    })

    it('Edit bio', async (done) => {
        var req = request.post('/editBio')
        req.cookies = this.Cookies;
        await req
            .type('form')
            .send({
                bio: "I am a test user",
            })
            .expect(302)
            .expect('Location', /profile/)
        done()
    })

    it('Get followers page', async (done) => {
        var req = request.post('/followers/jest')
        req.cookies = this.Cookies;
        await req
            .expect(200)
        done()
    })

    it('Get following page', async (done) => {
        var req = request.post('/following/jest')
        req.cookies = this.Cookies;
        await req
            .expect(200)
        done()
    })

    //   it('Make post', async(done) => {
    //     var req = request.post('/makePost')
    //     req.cookies = this.Cookies;
    //     await req
    //     .type('form')
    //     .send({
    //         username: "jest",
    //         postContent: "Testing a new posts on this site",
    //         interest: "Soccer",
    //         addInterest: "testing"
    //     })
    //     .expect(302)
    //     .expect('Location', /profile/)
    //     done()
    //   })

    //   it('Check for post', async(done) => {
    //     Post.findOne({author: "jest", text: "Testing a new posts on this site", interest: "Soccer"} , function(error, foundPost) {
    //       expect(foundPost).not.toBeNull();
    //       done()
    //     })
    //   })

    it('page does not exist', async (done) => {
        await request.get('/sdgdsfgdsfgdsf')
            .expect(404)
        done()
    })

    it('Get edit interest page', async (done) => {
        var req = request.get('/editInterests')
        req.cookies = this.Cookies;
        await req
            .expect(200)
        done()
    })

    it("get other user's profile information", async (done) => {
        var req = request.get('/profile/allen')
        req.cookies = this.Cookies;
        await req
            .expect(200)
            .then((response) => {
                response.text.should.match(/allen's Profile/);
                response.text.should.match(/Rutgers 2022 CS/);
                response.text.should.match(/Followers.*1/su);
                response.text.should.match(/Following.*1/su);

            })
        done()
    })

    it("get non-existent user's profile information", async (done) => {
        var req = request.get('/profile/user234234')
        req.cookies = this.Cookies;
        await req
            .expect(302)
            .expect('Location', /error/)
        done()
    })

    it("get banned user's profile information", async (done) => {
        var req = request.get('/profile/username')
        req.cookies = this.Cookies;
        await req
            .expect(200)
            .then((response) => {
                response.text.should.match(/User is currently banned./);

            })
        done()
    })

    it("get explore page", async (done) => {
        var req = request.get('/explore')
        req.cookies = this.Cookies;
        await req
            .expect(200)
        done()
    })

    it("get popular page", async (done) => {
        var req = request.get('/popular')
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