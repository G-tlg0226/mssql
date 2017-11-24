/**
 * @description DBS <==> database Server
 * @description DBC <==> database Connection
 * @description DBP <==> database Pool
 * @description DBM <==> database Manager
 * @description DBO <==> database Operation
 * @description DBPI <==> database Pool Information
 * @description DBSE <==> database Server Event
 * @description 连接池 <==> 池
 * @description 资源 <==> 连接或链接
 *
 * @event connect:first 首次连接SQL Server服务器，验证数据库服务器连接是否就绪
 * @event connect:error 连接数据库服务器时出错
 * @event connect:debug 开发时连接数据库服务器过程中的操作
 * @event connect:close:failed  关闭数据库服务器连接失败
 * @event connect:close:success 关闭数据库服务器连接成功
 * @event pool:create:error 创建连接池时出错
 * @event pool:destroy:error 销毁连接池时出错
 * @event pool:close:failed  关闭连接池失败
 * @event pool:close:success  关闭连接池成功 
 * 
 * @default sqlCfg  连接 SQL Server 服务器的配置 
 * @default poolConfig 创建连接池时使用的配置
 */
const EventEmitter = require('events').EventEmitter,
	Connection = require('tedious').Connection,
	debug = require('debug')('DBM'),
	chalk = require('chalk'),
	generic = require('./pool'),
	sqlCfg = require('./sqlCfg').tedious

/* eslint no-console: off */
class Manager extends EventEmitter {
	constructor() {
		super()
		let log = console.log
		// this.on( 'connect:first', () => log( chalk.yellow( '[DB] Request Success' ) ) )
		this.on('connect:error', (err) => log(chalk.red('[DB] Connect Failed %o', err)))
		this.on('connect:debug', (client) => log(chalk.grey('[DB] Bubeg Mode , Client : %o'), client))
		this.on('connect:close:failed', () => log(chalk.red('[DB] Close Failed')))
		this.on('connect:close:success', () => log(chalk.yellow('[DB] Close Success')))

		this.on('pool:create:error', (err, name) => log(chalk.red(`[DBP]-${name} Created Failed, Error: ${err}`)))
		this.on('pool:destroy:error', (err, name) => log(chalk.red(`[DBP]-${name} Destroy Failed, Error: ${err}`)))
		this.on('pool:close:failed', (err, name) => log(chalk.red(`[DBP]-${name} Close Failed, Error: ${err}`)))
		this.on('pool:close:success', name => log(chalk.yellow(`[DBP]-${name} Close Success`)))

		debug('数据库连接管理类的实例化成功')
	}

	/**
     * @type {object}
     */
	get sqlCfg() {
		return sqlCfg
	}

	/**
     * @type {object}
     */
	set sqlCfg(config) {
		const cfg = this.sqlCfg
		cfg.userName = config.user
		cfg.password = config.password
		cfg.server = config.server
		cfg.options.database = config.database
		cfg.options.port = config.port
		cfg.options.connectTimeout = config.timeout || 15000
		cfg.options.requestTimeout = config.reqTimeout || 15000
		cfg.options.tdsVersion = config.tdsVersion || '7_4'
		cfg.options.instanceName = config.instance || false

		if (cfg.options.instanceName) {
			delete cfg.options.port //  当指定了端口时，使用 TCP 连接sql server
		}

		if (isNaN(cfg.options.requestTimeout)) {
			cfg.options.requestTimeout = 15000
		}

		if (cfg.options.requestTimeout === Infinity || cfg.options.requestTimeout < 0) {
			cfg.options.requestTimeout = 0
		}

		if (config.debug === true) {
			cfg.options.debug = {
				packet: true,
				token: true,
				data: true,
				payload: true
			}
		}

		return cfg
	}


	/**
     * 创建数据库服务器（ SQL Server ）连接
     * @public
     * @returns Promise
     */
	createDBC(config) {
		if (({}).toString.call(config) !== '[object Object]') {
			throw new Error('请传入正确的数据库服务器连接配置')
		} else {
			this.sqlCfg = config
		}
		return new Promise((resolve, reject) => {

			const client = new Connection(this.sqlCfg)

			client.once('connect', err => {
				if (err) {
					reject(err)
				} else {
					this.emit('connect:first')
					resolve(client)
				}
			})

			client.on('error', err => {
				if (err.code === 'ESOCKET') {
					client.hasError = true
				} else {
					this.emit('connect:error', err)
				}
			})

			if (this.sqlCfg.options.debug) {
				client.on('debug', () => this.emit('debug', client))
			}
		})
	}

	/**
     * 关闭数据库服务器连接
     * @param {object} client 需要关闭的数据库服务器连接的客户端引用
     * @returns Promise
     */
	closeDBC(client) {
		if (({}).toString.call(client) !== '[object Object]') {
			throw new Error('请传入要关闭的数据库服务器的连接的引用！')
		}
		client.on('end', (err) => {
			if (err) {
				this.emit('connect:close:failed', err)
			} else {
				this.emit('connect:close:success')
			}
		})
		client.close()
	}

	/**
     * 创建一个数据库连接池
     * @public
     * @param {object} config 创建数据库连接池时的配置
     * @returns Promise
     */
	createDBP(config = {}) {
		return generic.getPool({
			open: () => this.createDBC(config),
			down: (client) => Promise.resolve(this.closeDBC(client)),
			valid: (client) => Promise.resolve(client.loggedIn && !client.closed && !client.hasError),
			reset: (client) => new Promise((resolve, reject) => {
				client.reset((err) => {
					if (err) {
						reject(err)
					} else {
						resolve(client)
					}
				})
			})
		}, config.pool)
	}

	/**
     * 关闭一个数据库连接池
     * @public
     * @param {object} pool 一个连接池对象的引用 
     */
	closeDBP(pool, callback) {
		if ('function' === typeof pool.drain) {
			throw new Error('请传入要关闭的数据库连接池的引用！')
		}
		pool.drain().then((err) => {
			if (err) {
				this.emit('pool:close:failed', err, pool.__DESCRIBE__)
				'function' === typeof callback && callback(err, pool)
			} else {
				this.emit('pool:close:success', pool.__DESCRIBE__)
				'function' === typeof callback && callback(null, pool)
			}
		})
	}
}

module.exports.Manager = Manager