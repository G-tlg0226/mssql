exports = {
	default: {
		user: 'sa',
		port: '3344', // 外网连接端口: 3344 | 1433
		password: 'CD+erciyuandm', // ZyMk$$$2017 | CD+erciyuandm
		server: 'erciyuan.iok.la', // 外网连接地址: erciyuan.iok.la | 172.16.0.191
		database: 'manke',
		pool: {
			max: 10,
			min: 0,
			idleTimeoutMillis: 30000
		},
		log: true
	},
	_191: {
		user: 'sa',
		port: '3344', // 外网连接端口: 3344 | 1433
		password: 'CD+erciyuandm', // CD+erciyuandm
		server: 'erciyuan.iok.la', // 外网连接地址: erciyuan.iok.la | 172.16.0.191
		database: 'manke',
		pool: {
			max: 10,
			min: 0,
			idleTimeoutMillis: 30000
		}
	}
}