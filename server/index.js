const Koa = require('koa')
const fs = require('fs')
const http2 = require('http2');
const next = require('next')
const Router = require('koa-router')
const bodyParser = require('koa-bodyparser')
const session = require('koa-session')
const passport = require('koa-passport')
const bcrypt = require('bcrypt-nodejs')
const LocalStrategy = require('passport-local').Strategy
const Models = require('../models')

const dev = process.env.NODE_ENV !== 'production'
const port = dev ? 80 : 3000
const app = next({ dev })
const handle = app.getRequestHandler()

const api = require('./api')
const admin = require('./api/admin')

Models.sequelize.sync().then( () => {
  console.log(" DB 연결 성공")
}).catch(err => {
  console.log("연결 실패")
  console.log(err)
})

passport.use(new LocalStrategy({
  usernameField: 'email',
  passwordField: 'password',
  passReqToCallback: true,
  session: true,
},(req, email, password, done) => {
  Models.User.findOne({
    attributes: { exclude: ['salt'] },
    where: { email: email }
  }).then( result => {
    if (!result) {
      console.log('아이디없음')
      return done(null, false, { message: 'No Email' })
    }
    const user = result.dataValues
    if (!bcrypt.compareSync(password,result.dataValues.password)) { 
      console.log('비번틀림')
      return done(null, false, { message: 'Wrong Password' })
    }
    return done(null, user)
  }).catch( err => {
    return done(err)
  })
}))

passport.serializeUser((user, done) => {
  done(null, user)
})

passport.deserializeUser((user, done) => {
  done(null, user)
  // Models.User.findOne({
  //   where: {id: user.id}
  // }).then( result => {
  //   done(null, result)
  // }).catch( err => {
  //   done(err)
  // })
})

app.prepare().then(() => {
  const server = new Koa()
  const router = new Router()

  server.proxy = true
  server.keys = ['TraBSecret']

  server.use(session(server))
  server.use(bodyParser())
  server.use(passport.initialize())
  server.use(passport.session())
  
  router.get('/auth/signin', async (ctx, next) => {
    if(ctx.isAuthenticated()) {
      ctx.redirect('back')
    } else {
      await app.render(ctx.req, ctx.res, '/auth/signin', ctx.query)
      ctx.respond = false
    }
  })

  router.get('/auth/signup', async (ctx, next) => {
    if(ctx.isAuthenticated()) {
      ctx.redirect('back')
    } else {
      await app.render(ctx.req, ctx.res, '/auth/signup', ctx.query)
      ctx.respond = false
    }
  })

  router.get('/auth/mypage', async (ctx, next) => {
    if(ctx.isAuthenticated()) {
      await app.render(ctx.req, ctx.res, '/auth/mypage', ctx.query)
      ctx.respond = false
    } else {
      ctx.redirect('back')
    }
  })

  router.get('/planner/write', async ctx => {
    const { user } = ctx.state
    if(user && user.state_id >= 4) {
      await app.render(ctx.req, ctx.res, '/planner/write', ctx.query)
    } else {
      ctx.redirect('back')
    }
  })

  router.get('/board/write', async ctx => {
    const { user } = ctx.state
    if(user && user.state_id >= 2) {
      await app.render(ctx.req, ctx.res, '/board/write', ctx.query)
    } else {
      ctx.redirect('back')
    }
  })

  router.get('/board/:id/edit', async ctx => {
    const { id } = ctx.params
    const { user } = ctx.state
    if( !ctx.isAuthenticated() ) {
      ctx.redirect('back')
      return
    }

    const query = await Models.Board.findOne({
      where: { id: id, UserId: user.id }
    })

    if( query !== null && user.id === query.id) {
      await app.render(ctx.req, ctx.res, ctx.request.url, ctx.query)
    } else {
      ctx.redirect('back')
      return
    }
    
  })

  router.get('/admin', async ctx => {
    const { user } = ctx.state
    if(user && user.state_id === 9999) {
      await app.render(ctx.req, ctx.res, '/admin', ctx.query)
    } else {
      ctx.redirect('back')
    }
  })

  router.get('/admin/*', async ctx => {
    console.log(ctx.request.url)
    const { user } = ctx.state
    if(user && user.state_id === 9999) {
      await app.render(ctx.req, ctx.res, ctx.request.url, ctx.query)
    } else {
      ctx.redirect('back')
    }
  })

  router.all('*', async ctx => {
    await handle(ctx.req, ctx.res)
    ctx.respond = false
  })

  server.use(async (ctx, next) => {
    ctx.res.statusCode = 200
    await next()
  })

  server.use(api())
  server.use(admin())
  server.use(router.routes())

  if(dev) {
    const options = {
      cert: fs.readFileSync(__dirname + '/localhost.crt'),
      key: fs.readFileSync(__dirname + '/localhost.key')
    }
    http2.createSecureServer(options, server.callback()).listen(443, err => {
      if (err) throw err
      console.log(`> Ready on https://localhost`)
    })
  }
  // else {
    server.listen(port, err => {
      if (err) throw err
      console.log(`> Ready on http://localhost:${port}`)
    })
  // }
})