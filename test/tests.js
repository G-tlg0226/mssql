const sqlo = require('../lib/operation'),
	options = require('./config.js'),
	dbo = new sqlo.Operation(options)

for (let i = 0; i < 1; i++) {
	dbo.use('manke').query('select * from pub_class;', data => {
		// console.log( data )
	})
}