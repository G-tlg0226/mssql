const tds = require('tedious'),
	EventEmitter = require('events').EventEmitter,
	debug = require('debug')('DBO'),

	Manager = require('./manage').Manager,
	TYPES = tds.TYPES,

	Request = tds.Request,
	dbm = new Manager(),
	globalPools = {}

const createColumns = function (metadata) {
	let out = {}
	for (let index = 0, length = metadata.length; index < length; index++) {
		let column = metadata[index]

		out[column.colName] = {
			index,
			name: column.colName,
			length: column.dataLength,
			type: TYPES[column.type],
			scale: column.scale,
			precision: column.precision,
			nullable: !!(column.flags & 0x01),
			caseSensitive: !!(column.flags & 0x02),
			identity: !!(column.flags & 0x10),
			readOnly: !(column.flags & 0x0C)
		}

		if (column.udtInfo) {
			out[column.colName].udt = {
				name: column.udtInfo.typeName,
				database: column.udtInfo.dbname,
				schema: column.udtInfo.owningSchema,
				assembly: column.udtInfo.assemblyName
			}
		}
	}
	return out
}

/**
 * @name PoolOperation
 * @event serve:info 服务器返回一条信息 info => {number , state, class, message, procName, lineNumber}
 * @event serve:dbname 服务器返回发生变化的活动数据库 dbname => dbname
 * @event serve:charset 服务器字符集的变化 charset => charset
 * @event serve:lang 服务器语言变化 lang => lang
 * @event serve:safe 服务器建立了安全的连接 cleartext=> cleartext
 *                   cleartext : 一个tls的明文流。如果需要，可以检查密码和对等证书(服务器证书)。
 */

/* eslint no-console: off */
class Operation extends EventEmitter {
	constructor(config) {
		super()
		this.config = config || {} // user Config
		this.active = null // active database connect

		const log = console.log,
			infoHandler = msg => log('[DBS] Info MSG : %o', {
				number: msg.number,
				state: msg.state,
				class: msg.class,
				message: msg.message,
				procName: msg.procName,
				lineNumber: msg.lineNumber,
				serverName: msg.serverName
			})
		this.on('serve:info', infoHandler)
		this.on('serve:dbname', dbname => log('[DBS] database\'s name change, new : %s', dbname))
		this.on('serve:charset', charset => log('[DBS] charset change, new : %s', charset))
		this.on('serve:lang', lang => log('[DBS] language change, new : %s', lang))
		this.on('serve:safe', cleartext => log('[DBS] cleartext is : %s', cleartext))
	}

	/**
     * 执行SQL语句 无法处理参数
     * @param {string} sql
     * @param {callback} callback
     */
	query(sql, callback) {
		let result = [],
			request = null,
			eventsHandlers = {},
			errorHandler = (err) => {

			},
			metadataHandler = metadata => {
				/**
				 * step 1
				 * @default colName 列名
				 * @default type.name 列类型，例如 VarChar, Int , Binary.
				 * @default precision 精度  只对数字、小数生效.
				 * @default scale  放大率. 使用于整数、小数、time、datetime2 、datetimeoffset.
				 * @default dataLength  值长度,  适用于char, varchar, nvarchar , varbinary.
				 */
				let columns = createColumns(metadata)
			},
			rowHandler = (columns) => {

				/**
				 * step 2
				 * @param columns  数组或对象(取决于config.options.useColumnNames),
				 *                可以通过索引访问的index或name。每个列有两个属性:metadata 和 value。
				 */
				let col = {}
				columns.forEach((column) => {
					let key = column.metadata.colName
					if (column.value === null) {
						col[key] = ''
					} else {
						col[key] = column.value
					}
				})
				result.push(col)
			},
			doneInProcHandler = (rowCount, more, rows) => {
				/**
				 * step 3
				 * @param rowCount 结果集的行数，如果不可用，可能是undefined.
				 * @param more 如果存在更多的结果集，则为 true
				 * @param rows 执行SQL的结果。当且仅当 config.options.rowCollectionOnDone:true 时才可用
				 */
			},
			doneProcHandler = (rowCount, more, returnStatus, rows) => {
				/**
				 * step 4
				 * @param rowCount 结果集的行数，如果不可用，可能是undefined.
				 * @param more 如果存在更多的结果集，则为 true
				 * @param returnStatus 从存储过程返回的值。
				 * @param rows 执行SQL的结果。当且仅当 config.options.rowCollectionOnDone:true 时才可用
				 */
			},
			doneHandler = (rowCount, more, rows) => {
				console.log('aa', rows)
				/**
				 * step 5
				 * @param rowCount 结果集的行数，如果不可用，可能是undefined.
				 * @param more 如果存在更多的结果集，则为 true
				 * @param rows 执行SQL的结果。当且仅当 config.options.rowCollectionOnDone:true 时才可用
				 */
			}

		eventsHandlers.infoMessage = info => this.emit('serve:info', info)
		eventsHandlers.databaseChange = dbname => this.emit('serve:change', dbname)
		eventsHandlers.charsetChange = charset => this.emit('serve:charset', charset)
		eventsHandlers.languageChange = lang => this.emit('serve:lang', lang)
		eventsHandlers.secure = cleartext => this.emit('serve:safe', cleartext)
		eventsHandlers.errorMessage = errorHandler
		eventsHandlers.error = errorHandler
		return new Promise((resolve, reject) => {
			this.active.acquire().then((client) => {
				client.on('infoMessage', eventsHandlers.infoMessage)
				client.on('databaseChange', eventsHandlers.databaseChange)
				client.on('charsetChange', eventsHandlers.charsetChange)
				client.on('languageChange', eventsHandlers.languageChange)
				client.on('secure', eventsHandlers.secure)
				client.on('errorMessage', eventsHandlers.errorMessage)
				client.on('error', eventsHandlers.error)
				request = new Request(sql, (err, rowCount, rows) => {
					/**
					 * step 6
					 * @param err 错误对象，如果出现
					 * @param rowsCount 执行SQL语句的结果所返回的行数。
					 * @param rows 执行SQL语句的结果行
					 */
					for (let event in eventsHandlers) {
						client.removeListener(event, eventsHandlers[event])
					}
					this.active.release(client)
					if (err) {
						reject(err)
					} else {
						resolve(result)
					}
				}) // 6

				request.on('done', doneHandler) // 5
				request.on('doneProc', doneProcHandler) // 4
				request.on('doneInProc', doneInProcHandler) // 3
				request.on('row', rowHandler) // 2
				request.on('columnMetadata', metadataHandler) // 1
				client.execSql(request)
			})
		})
	}

	/**
     * 连接池切换 -> 数据库、数据库服务器
     * 连接池不存在时会根据已有的配置新开一个 
     * @param {string} key ==> server.database || database
     */
	use(key) {
		if (Reflect.has(globalPools, key)) {

			this.active = globalPools[key]
			debug('连接池 %s 已经开启 ，直接使用', key)

		} else if (typeof key === 'string') {

			let options = null

			if (key.indexOf('.') === -1) {
				if (Reflect.has(this.config, 'default')) {
					options = this.config.default
					options.database = key
				}
			} else {

				const sdb = key.split('.') // sdb <==> server.database
				options = this.config[sdb[0]]
				options.database = sdb[1]
			}

			if (!options) {
				throw new Error('请给出正确的连接配置')
			}

			options.pool.name = key
			this.active = dbm.createDBP(options)
			globalPools[key] = this.active
			debug('数据库连接池 %s 启动成功', key)
		}
		return this
	}


	batch() { }

	// insert( name, location, callback ) {
	//     console.log( 'Inserting \'' + name + '\' into Table...' )

	//     request = new Request(
	//         'INSERT NTO TestSchema.Employees (Name, Location) OUTPUT INSERTED.Id VALUES (@Name, @Location);',
	//         functin( err, rowCount, rows ) {
	//             if ( err ) {
	//                 callback( err )
	//             } else {
	//                 console.log( rowCount + ' row(s) inserted' )
	//                 callback( null, 'Nikita', 'United States' )
	//             }
	//         } )
	//     request.addParameter( 'Name', TYPES.NVarChar, name )
	//     request.addParameter( 'Location', TYPES.NVarChar, location )

	//     // Execute SQL statement
	//     connection.execSql( request )
	// }

	// delete( name, callback ) {
	//     console.log( 'Deleting \'' + name + '\' from Table...' )

	//     // Delete the employee record requested
	//     request = new Request(
	//         'DELETE ROM TestSchema.Employees WHERE Name = @Name;',
	//         functin( err, rowCount, rows ) {
	//             if ( err ) {
	//                 callback( err )
	//             } else {
	//                 console.log( rowCount + ' row(s) deleted' )
	//                 callback( null )
	//             }
	//         } )
	//     request.addParameter( 'Name', TYPES.NVarChar, name )

	//     // Execute SQL statement
	//     connection.execSql( request )
	// }

	// update( name, location, callback ) {
	//     console.log( 'Updating Location to \'' + location + '\' for \'' + name + '\'...' )

	//     // Update the employee record requested
	//     request = new Request(
	//         'UPDATE estSchema.Employees SET Location=@Location WHERE Name = @Name;',
	//         functin( err, rowCount, rows ) {
	//             if ( err ) {
	//                 callback( err )
	//             } else {
	//                 console.log( rowCount + ' row(s) updated' )
	//                 callback( null, 'Jared' )
	//             }
	//         } )
	//     request.addParameter( 'Name', TYPES.NVarChar, name )
	//     request.addParameter( 'Location', TYPES.NVarChar, location )

	//     // Execute SQL statement
	//     connection.execSql( request )
	// }

	/**
     * 数据查询
     * @param {string} sql 查询语句
     * @param {function} callback
     */
	select(sql, callback) {

	}
}

exports.Operation = Operation
exports.Manager = Manager
module.exports = Object.assign({}, exports, tds)