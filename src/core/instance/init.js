/* @flow */

import config from '../config'
import { initProxy } from './proxy'
import { initState } from './state'
import { initRender } from './render'
import { initEvents } from './events'
import { mark, measure } from '../util/perf'
import { initLifecycle, callHook } from './lifecycle'
import { initProvide, initInjections } from './inject'
import { extend, mergeOptions, formatComponentName } from '../util/index'

let uid = 0

export function initMixin (Vue: Class<Component>) {
  // 定义_init方法，实例化时调用
  Vue.prototype._init = function (options?: Object) {
    // 这里的this是vue实例
    const vm: Component = this
    // a uid
    vm._uid = uid++

    let startTag, endTag
    /* istanbul ignore if */
    if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
      startTag = `vue-perf-start:${vm._uid}`
      endTag = `vue-perf-end:${vm._uid}`
      mark(startTag)
    }

    // a flag to avoid this being observed
    vm._isVue = true
    // merge options
    // 有options且是组件时，初始化组件设置
    if (options && options._isComponent) {
      // optimize internal component instantiation
      // since dynamic options merging is pretty slow, and none of the
      // internal component options needs special treatment.
      initInternalComponent(vm, options)
    } else {
      // 否则直接合并配置
      vm.$options = mergeOptions(
        resolveConstructorOptions(vm.constructor),
        options || {},
        vm
      )
    }
    /* istanbul ignore else */
    if (process.env.NODE_ENV !== 'production') {
      initProxy(vm)
    } else {
      vm._renderProxy = vm
    }
    // expose real self
    vm._self = vm
    initLifecycle(vm) // 说是初始化生命周期，其实是初始化了一些内部变量
    initEvents(vm) // 添加事件监听
    initRender(vm) // 绑定创建vdom得方法,对$attrs和$listeners做侦听处理
    callHook(vm, 'beforeCreate') // 触发生命周期
    initInjections(vm) // resolve injections before data/props
    initState(vm) // 这里把state相关(data,method,props)初始化,所以之后可以在其内部使用this操作data
    initProvide(vm) // resolve provide after data/props
    callHook(vm, 'created')

    /* istanbul ignore if */
    if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
      vm._name = formatComponentName(vm, false)
      mark(endTag)
      measure(`vue ${vm._name} init`, startTag, endTag)
    }

    if (vm.$options.el) {
      vm.$mount(vm.$options.el)
    }
  }
}
// 初始化内部组件
export function initInternalComponent (vm: Component, options: InternalComponentOptions) {
  // 通过实例拿到构造函数并取配置
  const opts = vm.$options = Object.create(vm.constructor.options)
  // doing this because it's faster than dynamic enumeration.
  const parentVnode = options._parentVnode
  // 设置父节点及父节点的虚拟dom对象
  opts.parent = options.parent
  opts._parentVnode = parentVnode
  // 父节点虚拟dom中的配置
  const vnodeComponentOptions = parentVnode.componentOptions
  opts.propsData = vnodeComponentOptions.propsData
  opts._parentListeners = vnodeComponentOptions.listeners
  opts._renderChildren = vnodeComponentOptions.children
  opts._componentTag = vnodeComponentOptions.tag

  if (options.render) {
    opts.render = options.render
    opts.staticRenderFns = options.staticRenderFns
  }
}
// 处理构造函数中的配置
export function resolveConstructorOptions (Ctor: Class<Component>) {
  // 构造函数的配置
  let options = Ctor.options
  // 构造函数有父类
  if (Ctor.super) {
    // 递归配置
    const superOptions = resolveConstructorOptions(Ctor.super)
    // 构造函数中存的父配置
    const cachedSuperOptions = Ctor.superOptions
    // 父配置有改变
    if (superOptions !== cachedSuperOptions) {
      // super option changed,
      // need to resolve new options.
      // 重置配置
      Ctor.superOptions = superOptions
      // check if there are any late-modified/attached options (#4976)
      const modifiedOptions = resolveModifiedOptions(Ctor)
      // update base extend options
      if (modifiedOptions) {
        extend(Ctor.extendOptions, modifiedOptions)
      }
      // 归并配置
      options = Ctor.options = mergeOptions(superOptions, Ctor.extendOptions)
      if (options.name) {
        options.components[options.name] = Ctor
      }
    }
  }
  return options
}
// 处理调整配置
function resolveModifiedOptions (Ctor: Class<Component>): ?Object {
  let modified
  const latest = Ctor.options // 最新版本
  const sealed = Ctor.sealedOptions  // 确认版本
  for (const key in latest) {
    if (latest[key] !== sealed[key]) {
      if (!modified) modified = {}
      modified[key] = latest[key] // 处理差异
    }
  }
  return modified
}
