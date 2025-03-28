import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import typescript from '@rollup/plugin-typescript'

export default [
  {
    input: 'packages/vue/src/index.ts', // 入口文件
    output: [
      {
        sourcemap: true,
        file: './packages/vue/dist/vue.js', // 输出路径
        format: 'iife', // 生成文件的格式
        name: 'Vue' // 全局变量名
      }
    ],
    // 插件
    plugins: [
      typescript({ sourceMap: true }), // ts 支持
      resolve(), // 模板引入的路径补全
      commonjs() // 将 CommonJS 模块转换为 ES2015
    ]
  }
]
