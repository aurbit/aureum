import { exec } from 'child_process'
import { EventEmitter } from 'events'

const $control = new EventEmitter()
const startTime = new Date()
export const duration = () => new Date().getTime() - startTime.getTime() + ' ms'

let chain, migrate

before(function (done) {
  console.log('⏳ SETUP TESTS', startTime)
  chain = exec('npm run test:chain')

  chain.stdout.on('data', data => {
    if (data.match(/127.0.0.1:9545/)) {
      console.log('🔗 TEST CHAIN STARTED', duration())
      $control.emit('chain-up')
    }
  })

  $control.on('chain-up', () => {
    console.log('🔧 COMPILE AND DEPLOY', duration())
    migrate = exec('npm run migrate:test')

    migrate.stdout.on('data', data => {
      if (data.match(/Final cost:/)) {
        console.log('🍻 CONTRACTS DEPLOYED', duration())
        $control.emit('all-setup')
        done()
      }
    })
  })

  $control.on('all-setup', () =>
    console.log('🤘 SETUP COMPLETE', duration(), '\n')
  )
})

after(() => {
  console.log("🔪 KILLING TEST CHAIN. IT'S FINISHED!", duration())
  chain.kill('SIGINT')
})
