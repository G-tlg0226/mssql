/*
 * @Author: road.田路刚
 * @Date: 2017-11-01 18:58:09
 * @Last Modified by: road.田路刚
 * @Last Modified time: 2017-11-04 14:40:48
 *
 * @requires generic-pool tedious
 * @see https://github.com/coopernurse/node-pool
 *      http://tediousjs.github.io/tedious/parameters.html 
 *
 */

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
 *
 * @event pool:create:error 创建连接池时出错
 * @event pool:destroy:error 销毁连接池时出错
 * @event pool:close:failed  关闭连接池失败
 * @event pool:close:success  关闭连接池成功
 *
 *
 * @default userConfig 用户在使用该模块时应该使用的配置
 *          配置项 {
 *            ... sqlConfig 平行健值
 *            pool: poolConfig
 *          }
 * @default sqlConfig  连接 SQL Server 服务器的配置
 *          配置项  {
 *               user: 'sa',  // 用户名
 *               port: '3344',  // 连接端口
 *               password: 'CD+erciyuandm',  // 密码
 *               server: 'erciyuan.iok.la',  // 外网连接地址
 *               database: 'manke',  // 数据库名称
 *               timeout: 15000, // 数据库连接超时
 *               reqTimeout: 15000, // 数据库请求超时
 *               tdsVersion: '7_4' // TDS 版本号
 *               debug: false, // 是否开启debug模式
 *               instance: false, // 当指定端口时，总是使用TCP方式连接 SQL Server 服务器
 *          }
 * @default poolConfig 创建连接池时使用的配置
 *          配置项目 {
 *              max: 10,  //{Number} 任何给定的时间内，池可创建的最大的连接数。(默认值 1)
 *              min: 0,   //{Number} 任何给定的时间内，池中保持最少的连接数。(默认值 0) 若 min>=max 时，则 min=max。
 *              maxWaitingClients: 100,   // {Number} 从池中获取连接的队列的最大数，额外的获取连接的调用将在事件循环的未来循环中被回调。
 *              testOnBorrow: true, // {Boolean} 池将连接交出之前，是否验证连接可用，由factory.validate或factory.validateAsync指定验证函数
 *              testOnReturn: true, // {Boolean} 连接使用结束后，在归还到池中时验证其可用
 *              acquireTimeoutMillis: 15000, // {Number} 获取连接的超时时间，默认没有限制
 *              fifo: true, // {Boolean} 池中连接的分配方式，默认true，为队列模式，false时为堆栈调用模式
 *              priorityRange: 1, // {Number} 如果连接时，连接调用者可指定其在调用队里里的相对优先级（插队）。
 *              autostart: true, // { Boolean}  构造函数一旦调用，池就开始创建连接，初始化evictor ,当为false时，则通过 pool.start 来启动池，负责在第一次获取连接时启动池
 *              evictionRunIntervalMillis: 0, // {Number} 多久进行一次eviction检查闲置，默认0（不运行）
 *              numTestsPerEvictionRun: 3,  // {Number} 检查每次被驱逐的资源的数量
 *              softIdleTimeoutMillis: -1, // 池中闲置连接在
 *              idleTimeoutMillis: 30000  // 连接在池中闲置多久将被移除
 *          }
 */
const { EventEmitter } = require( 'events' ),
	gp = require( 'generic-pool' ), { Connection } = require( 'tedious' ),
	debug = require( 'debug' )( 'DBM' ),
	chalk = require( 'chalk' ),
	sqlConfig = {
		domain: null,
		userName: null,
		password: null,
		server: null,
		options: {
			database: 'null',
			port: 1433,
			connectTimeout: 0,
			requestTimeout: 0,
			tdsVersion: '7_4',
			appName: 'tlg-mssql',
			debug: false,
			rowCollectionOnDone: false,
			rowCollectionOnRequestCompletion: false,
			useColumnNames: false,
			instanceName: false

			// 以下配置可自行配置
			// fallbackToDefaultDb: false, // 使用options.database 无法访问数据库时，连接将会失败。为true时，将使用用户的默认数据库
			// enableAnsiNullDefault: true,
			// cancelTimeout: 0,
			// packetSize: 4096,
			// useUTC: true,
			// abortTransactionOnError: '',
			// localAddress: '',
			// useColumnNames: false, // 返回数组或简直对
			// camelCaseColumns: false, // 列名首字母大写
			// columnNameReplacer: null, // ( columnName, index, columnMetaData ) => {} // 列名处理 return string
			// debug: {
			//     packet: false, // packet的细节
			//     data: false, // packet数据的细节
			//     payload: false, // packet的有效负荷
			//     token: false // token 流
			// },
			// isolationLevel: 'READ_COMMITED', // 事务运行的隔离级别  tds.ISOLATION_LEVEL ==> READ_UNCOMMITTED  READ_COMMITTED  REPEATABLE_READ SERIALIZABLE SNAPSHOT
			// connectionIsolationLevel: 'READ_COMMITED', // 新连接的隔离级别 同上
			// readOnlyIntent: false, // 连接对数据库服务器是否只读权限
			// encrypt: false, // 连接是否会被加密
			// cryptoCredentialsDetails: {}, // 当encrypt为真时， 该值作为 tls.createSecurePair 调用的第一个参数，默认是{}
			// rowCollectionOnDone: false, // 是否在请求完成事件中公开接受所有行， 注意:如果接收到许多行，启用该选项可能导致内存占用过多。
			// rowCollectionOnRequestCompletion: false // 是否在请求的完成的回调中显示接收到的行
		}
	},
	poolConfig = {
		max: 10,
		min: 0,
		maxWaitingClients: 100,
		testOnBorrow: true,
		testOnReturn: true,
		acquireTimeoutMillis: 15000,
		fifo: true,
		priorityRange: 1,
		autostart: true,
		evictionRunIntervalMillis: 0,
		numTestsPerEvictionRun: 3,
		softIdleTimeoutMillis: -1,
		idleTimeoutMillis: 30000
	}

class Manager extends EventEmitter {
	constructor() {
		super()
		debug( '数据库连接管理类的实例化次数（包括错误）:', ++new.target.record )
		let log = console.log
		this.on( 'connect:first', () => log( chalk.yellow( '[DB] Connect Success' ) ) )
		this.on( 'connect:error', ( err ) => log( chalk.red( '[DB] Connect Failed' ) ) )
		this.on( 'connect:debug', ( client ) => log( chalk.grey( '[DB] Bubeg Mode , Client : %o' ), client ) )
		this.on( 'connect:close:failed', () => log( chalk.red( '[DB] Close Failed' ) ) )
		this.on( 'connect:close:success', () => log( chalk.yellow( '[DB] Close Success' ) ) )

		this.on( 'pool:create:error', ( err, name ) => log( chalk.red( `[DBP]-${name} Created Failed, Error: ${err}` ) ) )
		this.on( 'pool:destroy:error', ( err, name ) => log( chalk.red( `[DBP]-${name} Destroy Failed, Error: ${err}` ) ) )
		this.on( 'pool:close:failed', ( err, name ) => log( chalk.red( `[DBP]-${name} Close Failed, Error: ${err}` ) ) )
		this.on( 'pool:close:success', name => log( chalk.yellow( `[DBP]-${name} Close Success` ) ) )
	}

	/**
     * @type {object}
     */
	get sqlConfig() {
		return sqlConfig
	}

	/**
     * @type {object}
     */
	set sqlConfig( config ) {
		const cfg = this.sqlConfig
		cfg.userName = config.user
		cfg.password = config.password
		cfg.server = config.server
		cfg.options.database = config.database
		cfg.options.port = config.port
		cfg.options.connectTimeout = config.timeout || 15000
		cfg.options.requestTimeout = config.reqTimeout || 15000
		cfg.options.tdsVersion = config.tdsVersion || '7_4'
		cfg.options.instanceName = config.instance || false

		if ( cfg.options.instanceName ) {
			delete cfg.options.port //  当指定了端口时，使用 TCP 连接sql server
		}

		if ( isNaN( cfg.options.requestTimeout ) ) {
			cfg.options.requestTimeout = 15000
		}

		if ( cfg.options.requestTimeout === Infinity || cfg.options.requestTimeout < 0 ) {
			cfg.options.requestTimeout = 0
		}

		if ( config.debug === true ) {
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
	createDBC( config ) {
		if ( ( {} ).toString.call( config ) !== '[object Object]' ) {
			throw new Error( '请传入正确的数据库服务器连接配置' )
		} else {
			this.sqlConfig = config
		}
		return new Promise( ( resolve, reject ) => {

			const client = new Connection( this.sqlConfig )

			client.once( 'connect', err => {
				if ( err ) {
					reject( err )
				} else {
					this.emit( 'connect:first' )
					resolve( client )
				}
			} )

			client.on( 'error', err => {
				if ( err.code === 'ESOCKET' ) {
					client.hasError = true
				} else {
					this.emit( 'connect:error', err )
				}
			} )

			if ( this.sqlConfig.options.debug ) {
				client.on( 'debug', () => this.emit( 'debug', client ) )
			}
		} )
	}

	/**
     * 关闭数据库服务器连接
     * @param {object} client 需要关闭的数据库服务器连接的客户端引用
     * @returns Promise
     */
	closeDBC( client ) {
		if ( ( {} ).toString.call( client ) !== '[object Object]' ) {
			throw new Error( '请传入要关闭的数据库服务器的连接的引用！' )
		}
		client.on( 'end', ( err ) => {
			if ( err ) {
				this.emit( 'connect:close:failed', err )
			} else {
				this.emit( 'connect:close:success' )
			}
		} )
		client.close()
	}


	/**
     * @type {object}
     */
	get poolConfig() {
		return poolConfig
	}

	/**
     * @type {object}
     */
	set poolConfig( config ) {
		const cfg = this.poolConfig
		cfg.max = config.max || 10
		cfg.min = config.min || 0
		cfg.maxWaitingClients = config.maxWaitingClients || 100
		cfg.testOnBorrow = config.testOnBorrow === false ? config.testOnBorrow : true
		cfg.testOnReturn = config.testOnReturn === false ? config.testOnReturn : true
		cfg.acquireTimeoutMillis = config.acquireTimeoutMillis || 5000
		cfg.fifo = config.fifo !== false ? config.fifo : true
		cfg.priorityRange = config.priorityRange || 1
		cfg.autostart = config.autostart === false ? config.autostart : true
		cfg.evictionRunIntervalMillis = config.evictionRunIntervalMillis || 0
		cfg.numTestsPerEvictionRun = config.numTestsPerEvictionRun || 3
		cfg.softIdleTimeoutMillis = config.softIdleTimeoutMillis || -1
		cfg.idleTimeoutMillis = config.idleTimeoutMillis || 30000
		return cfg
	}

	/**
     * 创建一个数据库连接池
     * @public
     * @param {object} config 创建数据库连接池时的配置
     * @returns Promise
     */
	createDBP( config = {} ) {
		this.poolConfig = config.pool
		let factory = {
				create: () => this.createDBC( config ),
				validate: ( client ) => Promise.resolve( client.loggedIn && !client.closed && !client.hasError ),
				destroy: ( client ) => Promise.resolve( this.closeDBC( client ) )
			},
			pool = gp.createPool( factory, this.poolConfig )

		pool.__DESCRIBE__ = config.describe // 连接池标记

		pool.on( 'factoryCreateError', ( err ) => this.emit( 'pool:create:error', err, pool.__DESCRIBE__ ) )
		pool.on( 'factoryDestroyError', ( err ) => this.emit( 'pool:create:error', err, pool.__DESCRIBE__ ) )
		return pool
	}

	/**
     * 关闭一个数据库连接池
     * @public
     * @param {object} pool 一个连接池对象的引用
     * @returns Promise
     */
	closeDBP( pool, callback ) {
		if ( !pool.drain ) {
			throw new Error( '请传入要关闭的数据库连接池的引用！' )
		}
		pool.drain().then( ( err ) => {
			if ( err ) {
				this.emit( 'pool:close:failed', err, pool.__DESCRIBE__ )
				'function' === typeof callback && callback( err, pool )
			} else {
				pool.clear()
				this.emit( 'pool:close:success', pool.__DESCRIBE__ )
				'function' === typeof callback && callback( null, pool )
			}
		} )
	}

	/**
     * 查看连接池的信息
     * @param {object} pool
     */
	displayDBPI( pool ) {
		if ( ( {} ).toString.call( pool ) !== '[object Object]' ) {
			throw new Error( '请传入正确的数据库服务器连接配置' )
		}
		return {
			spareResourceCapacity: pool.spareResourceCapacity,
			size: pool.size,
			available: pool.available,
			borrowed: pool.borrowed,
			pending: pool.pending,
			max: pool.max,
			min: pool.min
		}
	}
}

// Manager Instantiation Number
Object.defineProperty( Manager, 'record', {
	value: 0,
	configurable: true,
	writable: true,
	enumerable: false
} )

module.exports.Manager = Manager