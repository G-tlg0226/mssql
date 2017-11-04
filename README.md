## node-sqlo  
> 将nodejs操作SQL Server简单化

## Usage
> 需要nodejs 7 或 更高
``` javascript
    npm install sqlo 
```

## Documentation
 - creatDBC 创建数据库连接
 - closeDBC 关闭数据库连接
 - creatDBP 创建数据库连接池
 - closeDBP 关闭数据库连接池
 - displayDBPI 返回指定连接池的信息
 - use 数据库(数据库服务器)切换
 - query 执行
 - batch 批执行
 - insert 新增
 - delete 删除
 - update 修改
 - select 查询
 - prepare 预执行
 - transaction 事务(开发中)
 - orm（提供SQL Server的orm支持，未来会支持）
 
 ------
 ### UserConfig
 ``` javascript 
    {
      default:{
          user: 'sa',  // 用户名
          port: '3344',  // 连接端口
          password: '123456',  // 密码
          server: 'tlg',  // 外网连接地址
          database: 'tlg',  // 数据库名称
          timeout: 15000, // 数据库连接超时
          reqTimeout: 15000, // 数据库请求超时
          tdsVersion: '7_4' // TDS 版本号
          debug: false, // 是否开启debug模式
          instance: false, // 当指定端口时，总是使用TCP方式连接 SQL Server 服务器
          pool:  {
               max: 10, //{Number} 任何给定的时间内，池可创建的最大的连接数。(默认值 1)
               min: 0, //{Number} 任何给定的时间内，池中保持最少的连接数。(默认值 0) 若 min>=max 时，则 min=max。 
               maxWaitingClients: 100, // {Number} 从池中获取连接的队列的最大数，额外的获取连接的调用将在事件循环的未来循环中被回调。
               testOnBorrow: true,// {Boolean} 池将连接交出之前，是否验证连接可用，由factory.validate或factory.validateAsync指定验证函数  
               testOnReturn: true, // {Boolean} 连接使用结束后，在归还到池中时验证其可用
               acquireTimeoutMillis: 15000, // {Number} 获取连接的超时时间，默认没有限制
               fifo: true, // {Boolean} 池中连接的分配方式，默认true，为队列模式，false时为堆栈调用模式
               priorityRange: 1, // {Number} 如果连接时，连接调用者可指定其在调用队里里的相对优先级（插队）。
               autostart: true, // { Boolean}  构造函数一旦调用，池就开始创建连接，初始化evictor ,当为false时，则通过 pool.start 来启动池，负责在第一次获取连接时启动池
               evictionRunIntervalMillis: 0, // {Number} 多久进行一次eviction检查闲置，默认0（不运行）
               numTestsPerEvictionRun: 3,  // {Number} 检查每次被驱逐的资源的数量
               softIdleTimeoutMillis: -1, // 池中闲置连接在
               idleTimeoutMillis: 30000  // 连接在池中闲置多久将被移除
            }
        },

        serverX:{
            // 配置如上
        }
    } 
```

## License
Copyright (c) 2017   

The MIT License
