const DBO = require( '../index.js' ),
	options = require( './config' ),
	dbo = new DBO( options )

dbo.use( 'manke' ).query( 'select * from pub_class;', data => {
	console.log( data )
} )