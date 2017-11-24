module.exports.tedious = {
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
		appName: 'sqlo',
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
}