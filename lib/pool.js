'use strict'
/* eslint no-console:off */
const
	chalk = require('chalk'),
	EventEmitter = require('events').EventEmitter,
	debug = require('debug')('Database Pool'),
	isPromise = (obj) => {
		return !!obj && (typeof obj === 'object' || typeof obj === 'function') && typeof obj.then === 'function'
	}
let count = 0 // 连接池连接数统计

// 池配置
class Config {
	constructor(config) {
		debug('实例化池配置 Config , 开始合并参数')

		// 最多可创建多少连接
		this.max = config.max || 50

		// 启动时创建多少连接，最大不超过 this.max 
		this.min = Math.min(this.max, config.min >= 0 ? config.min : 10)

		// 闲置时间，当连接闲置时间大于this.idler就关闭此连接, 设为 false 时不执行关闭操作
		this.idler = config.idler === false ? false : (config.idler || 300001)

		// 一次连接失败后，隔多久后尝试重连，当设为false时不执行重连操作
		this.retry = config.retry === false ? false : (config.retry || 5000)

		// 从连接池里获取一个超时
		this.atime = config.atime || 60000

		// 连接池的名称 , 默认名字 tlg
		this.name = config.name || 'tlg'

		// 连接池日志函数 , false时禁用日志功能
		this.log = 'function' === typeof config.log
			? config.log
			: config.log === false
				? () => { }
				: (...arg) => {
					arg.unshift(chalk.yellow('[SQLO-Pool]'))
					console.log.apply(null, arg)
				}

		// 自动初始化连接池, 当设为false时，需要在实例化连接池对象之后，调用启动函数
		this.autostart = config.autostart === false ? false : true
	}
}

// 池属性
class Option {
	constructor() {
		debug('实例化池属性 Option')
		// 可用连接数量
		this._available = 0

		// 等着者数量
		this._waiters = 0

		// 连接中的数量
		this._pending = 0

		// 最大连接数
		this._max = 0

		// 最小连接数
		this._min = 0
	}

	get available() {
		return this._available
	}
	set available(num) {
		this._available = num
	}

	get waiters() {
		return this._waiters
	}
	set waiters(num) {
		this._waiters = num
	}

	get pedding() {
		return this._pending
	}
	set pending(num) {
		this._pending = num
	}

	get max() {
		return this._max
	}
	set max(num) {
		this._max = num
	}

	get min() {
		return this._min
	}
	set min(num) {
		this._min = num
	}
}

// 连接状态
const Status = {

	get pending() {
		// 等待
		return 0
	},
	get free() {
		// 闲置
		return 1
	},
	get used() {
		// 使用中
		return 2
	},
	get retry() {
		// 重试中
		return 3
	},
	get dead() {
		// 死连接
		return -1
	}
}

// 连接
class Creator {

	constructor(options) {
		debug('实例化创造者 Creator')
		if (({}).toString.call(options) !== '[object Object]') {

			throw new TypeError('Creator只有一个参数，必须是对象类型')
		} else {
			if (!Reflect.has(options, 'open') || 'function' !== typeof options.open) {

				throw new TypeError('Creator参数须包含open属性，该属性为函数类型,该函数须返回Promise，且在resovle中传入数据库连接的引用')
			} else if (!Reflect.has(options, 'reset') || 'function' !== typeof options.reset) {

				throw new TypeError('Creator参数须包含reset属性，且该属性是函数类型，该函数须返回Promise,且在resolve中返回重置后的新连接')
			} else if (!Reflect.has(options, 'down') || 'function' !== typeof options.down) {

				throw new TypeError('Creator参数须包含down属性，且该属性是函数类型，用于关闭数据库连接')
			} else if (Reflect.has(options, 'valid') && 'function' !== typeof options.valid) {

				throw new TypeError('Creator参数的valid属性可选，一旦设置，必须是返回boolean类型的函数，用于能证明数据连接的状态，默认为true，表示连接正常')
			}
		}
		this.open = options.open
		this.reset = options.reset
		this.down = options.down
		this.valid = options.valid || true
	}
}

/**
 * 连接池对象
 */
class Pool extends EventEmitter {
	constructor(creator, config) {
		super()
		this.creator = new Creator(creator) // 连接创造者
		this.config = new Config(config) // 连接池配置 
		this.option = new Option() // 连接池属性
		this.stores = [] // 连接池存储
		this.waiter = [] // 等着中的请求

		this.option.max = this.config.max
		this.option.min = this.option.min
		this.drained = false // 连接池的状态 

		debug('实例化连接池 Pool %s', this.config.name)
		this.config.autostart === true && this.start() // 初始化连接池
	}

	/**
     * 查看连接池属性
     */
	display() {
		return this.option
	}

	/**
     * 连接池启动
     */
	start() {
		// 连接池已经消亡
		if (this.drained) return

		let available = 0,
			log = this.config.log

		for (let request of this.stores) {
			if (request.status !== Status.used) {
				available++
			}
		}
		this.option.available = available

		let amount = Math.min(
			this.config.max - this.stores.length, //最大可创建多少
			this.waiter.length - available) // 需要创建多少

		// 连接数数最小化
		amount = Math.max(
			this.config.min - this.stores.length,
			amount)

		if (amount > 0)
			log('需要创建' + amount + '个连接')

		this.option.pending = amount
		for (let i = 0; i < amount; i++) {
			let request = {
				uuid: ++count,
				status: Status.pending
			}
			this.getClient(request)
		}
	}

	/**
     * 创建一个连接对象
     */
	getClient(request = {}) {
		let log = this.config.log,
			open = this.creator.open()

		if (isPromise(open)) {
			open.then((client) => {
				request.client = client
				// 新建连接前置
				this.stores.push(request)
				log('数据库连接创建成功 ID', request.uuid)
			}).catch((err) => {
				log('数据库连接创建失败，正在尝试重新创建，错误信息 ', err)

				request.status = Status.retry
				request.client = undefined
				if (request.timeout) {
					clearTimeout(request.timeout)
				}
				request.timeout = setTimeout(this.getClient.bind(this, request), this.config.retry)
				this.emit('openError', err, request)
			})
		} else {
			this.emit('openError', new Error('连接创建函数必须返回一个promise'))
			log('连接创建失败 , ID', request.uuid)
		}

	}

	/**
     * 释放连接
     */
	release(client) {
		if (this.drained) return

		let log = this.config.log
		for (let request of this.stores) {
			if (request.client === client) {
				let reset = this.creator.reset(client)
				if (isPromise(reset)) {
					reset.then((newClient) => {
						request.client = newClient
						let waiter = this.waiter.shift()

						if (waiter !== undefined) {

							request.status = Status.used
							if (request.timeout) {
								clearTimeout(request.timeout)
								request.timeout = undefined
							}
							if (waiter.timeout) {
								clearTimeout(waiter.timeout)
								waiter.timeout = undefined
							}
							log('连接重置成功, 其ID: %d，成功分配到等待者', request.uuid)
							waiter.resolve = Promise.resolve(request.client)
						} else {
							request.status = Status.free
							request.timeout = setTimeout(function () {
								this.creator.down(request.client)
								log('连接重置成功, 其ID: %d , 但没有等待者，已被关闭', request.uuid)
							}, this.config.idler)

						}
					}).catch((err) => {
						this.emit('resetError', err)
					})
				} else {
					this.emit('resetError', new Error('连接重置函数必须返回一个promise对象'))
				}
				return
			}
		}
	}

	/**
     * 获取连接
     */
	acquire() {
		debug('开始获取连接')
		if (this.drained) return
		let freeRequest, log = this.config.log
		for (let request of this.stores) {
			if (request.status === Status.free) {
				freeRequest = request
				break
			}
		}

		let user = {
			resolve: undefined,
			reject: undefined
		}

		if (!freeRequest) {
			if (this.config.atime) {
				user.timeout = setTimeout(() => {
					for (let [waiter, index] of this.waiter) {
						if (waiter.timeout === user.timeout) {
							this.waiter.splice(index, 1)
							let err = new Error('等待者等候超时')
							log('没有可用连接，%o', err)
							waiter.reject = Promise.reject(err)
							break
						}
					}
					this.option.waiters = this.waiter.length
				}, this.config.atime)
			}

			this.waiter.push(user)
			this.option.waiters = this.waiter.length
			this.start()
		} else {
			freeRequest.status = Status.used
			if (freeRequest.timeout) {
				clearTimeout(freeRequest.timeout)
				freeRequest.timeout = undefined
			}
			if (user.timeout) {
				clearTimeout(user.timeout)
				user.timeout = undefined
			}
			log('连接获取成功, 其ID: %d，成功分配给使用者', freeRequest.uuid)
			let valid = this.creator.valid(freeRequest.client)

			if (isPromise(valid)) {
				user.resolve = valid.then(() => freeRequest.client)
				return user.resolve
			} else {
				log('连接无效，其ID : %d', freeRequest.uuid)
				user.reject = valid.then(() => new Error('连接无效 ，其ID : %d ', freeRequest.uuid))
				return user.reject
			}
		}
	}

	/**
     * 关闭连接池
     */
	drain(callback) {
		let name = this.config.name,
			isCallback = 'function' === typeof callback
		if (this.drained) {
			if (isCallback) {
				return callback(`连接池 ${name} 已经清理了！`)
			}
		}

		let log = this.config.log
		log('开始清理连接 %s ', name)

		this.drained = true
		for (let waiter of this.waiter) {
			if (waiter.timeout) { clearTimeout(waiter.timeout) }
		}
		this.waiter = null

		let length = this.stores.length
		if (length === 0 && isCallback) {
			callback()
		} else {
			for (let [request, index] of this.stores) {
				if (request.timeout)
					clearTimeout(request.timeout)

				if (request.client) {
					let down = this.creator.down(request.client)
					if (isPromise(down)) {
						down.then(() => {
							log('连接关闭成功 其ID %d', request.uuid)
							if (index === length - 1) {
								log('连接池 %s 里的连接全部关闭', name)
							}
						})
					}
				} else {
					if (index === length - 1 && isCallback) {
						callback()
					}
				}
			}
		}

		this.stores = null
		this.option = null
		this.config = null
		this.creator = null
	}
}

module.exports.Creator = Creator
module.exports.Pool = Pool
module.exports.getPool = function (creator, config) {
	return new Pool(creator, config)
}