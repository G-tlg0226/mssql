const TYPES = require( 'tedious' ).TYPES

exports.get = function( type, length ) {
    switch( type ) {
    case TYPES.Char:
        return TYPES.Char
    case TYPES.NChar:
        return TYPES.NChar
    case TYPES.VarChar:
        return TYPES.VarChar
    case TYPES.NVarChar:
        return TYPES.NVarChar
    case TYPES.Text:
        return TYPES.Text
    case TYPES.NText:
        return TYPES.NText
    case TYPES.Int:
        return TYPES.Int
    case TYPES.IntN:
        if( length === 8 ) {
            return TYPES.BigInt
        }
        if( length === 4 ) {
            return TYPES.Int
        }
        if( length === 2 ) {
            return TYPES.SmallInt
        }
        return TYPES.TinyInt
    case TYPES.BigInt:
        return TYPES.BigInt
    case TYPES.TinyInt:
        return TYPES.TinyInt
    case TYPES.SmallInt:
        return TYPES.SmallInt
    case TYPES.Bit:
    case TYPES.BitN:
        return TYPES.Bit
    case TYPES.Float:
        return TYPES.Float
    case TYPES.FloatN:
        if( length === 8 ) {
            return TYPES.Float
        }
        return TYPES.Real
    case TYPES.Real:
        return TYPES.Real
    case TYPES.Money:
        return TYPES.Money
    case TYPES.MoneyN:
        if( length === 8 ) {
            return TYPES.Money
        }
        return TYPES.SmallMoney
    case TYPES.SmallMoney:
        return TYPES.SmallMoney
    case TYPES.Numeric:
    case TYPES.NumericN:
        return TYPES.Numeric
    case TYPES.Decimal:
    case TYPES.DecimalN:
        return TYPES.Decimal
    case TYPES.DateTime:
        return TYPES.DateTime
    case TYPES.DateTimeN:
        if( length === 8 ) {
            return TYPES.DateTime
        }
        return TYPES.SmallDateTime
    case TYPES.TimeN:
        return TYPES.Time
    case TYPES.DateN:
        return TYPES.Date
    case TYPES.DateTime2N:
        return TYPES.DateTime2
    case TYPES.DateTimeOffsetN:
        return TYPES.DateTimeOffset
    case TYPES.SmallDateTime:
        return TYPES.SmallDateTime
    case TYPES.UniqueIdentifierN:
        return TYPES.UniqueIdentifier
    case TYPES.Image:
        return TYPES.Image
    case TYPES.Binary:
        return TYPES.Binary
    case TYPES.VarBinary:
        return TYPES.VarBinary
    case TYPES.Xml:
        return TYPES.Xml
    case TYPES.UDT:
        return TYPES.UDT
    case TYPES.TVP:
        return TYPES.TVP
    case TYPES.Variant:
        return TYPES.Variant
    }
}
