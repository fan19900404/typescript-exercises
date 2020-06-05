import * as fs from 'fs';

const readFile = (path: fs.PathLike | number) => {
  return new Promise<string>((resolve, reject) => {
    fs.readFile(path, (err, data) => {
      if (err) {
        return reject(err);
      }
      resolve(data.toString());
    });
  });
};

/** 常规处理规则 */
type QueryRule = {
  /**  $eq operator means "===", syntax {fieldName: {$gt: value}} */
  $eq?: string | number;
  /** $gt operator means ">", syntax {fieldName: {$gt: value}} */
  $gt?: number;
  /** $lt operator means "<", syntax {fieldName: {$lt: value}} */
  $lt?: number;
  $in?: (number | string)[];
};

/** 常规参数处理 */
type Param<T> = {
  [P in keyof T]?: QueryRule;
};

/** 顶级处理规则 */
type QueryRootRule<T> = {
  /** $and condition is satisfied when all the nested conditions are satisfied: {$and: [condition1, condition2, ...]} */
  $and?: Param<T>[];
  /** $or condition is satisfied when at least one nested condition is satisfied: {$or: [condition1, condition2, ...]} */
  $or?: Param<T>[];
  $text?: string;
};

/** 字段处理 */
type ParamEndRule<T> = {
  [P in keyof T]?: 1 | -1;
};

/** 排序，字段筛选 等结果处理功能 */
type EndRule<T> = {
  /** 字段筛选*/
  projection?: ParamEndRule<T>;
  /** 排序 */
  sort?: ParamEndRule<T>;
};

/** 语句类型 */
type Query<T> = Param<T> & QueryRootRule<T>;

/**
 * 筛选相等的数据
 * @param data 单条原始数据
 * @param key 需要对比的字段
 * @param value 字段的值
 */
const $eq = <T>(data: T, key: keyof Param<T>, value: QueryRule['$eq']) => {
  const val = data[key];
  if (typeof val === 'string') {
    return val === value;
  }

  if (typeof val === 'number') {
    return val === value;
  }

  return false;
};

/**
 * 筛选大于的数据
 * @param data 单条原始数据
 * @param key 需要对比的字段
 * @param value 字段的值
 */
const $gt = <T>(data: T, key: keyof Param<T>, value: QueryRule['$gt']) => {
  const val = data[key];
  if (typeof val === 'number') {
    return val > Number(value);
  }
  return false;
};

/**
 * 筛选小于的数据
 * @param data 单条原始数据
 * @param key 需要对比的字段
 * @param value 字段的值
 */
const $lt = <T>(data: T, key: keyof Param<T>, value: QueryRule['$lt']) => {
  const val = data[key];
  if (typeof val === 'number') {
    return val < Number(value);
  }
  return false;
};
/**
 * in操作，检验字段的值是否在集合中
 * @param data 单条原始数据
 * @param key 需要对比的字段
 * @param value 字段的值
 */
const $in = <T>(
  data: T,
  key: keyof Param<T>,
  value: Exclude<QueryRule['$in'], undefined>
) => {
  const val = data[key];
  if (typeof val === 'number') {
    return value.indexOf(val) > -1;
  }
  if (typeof val === 'string') {
    return value.indexOf(val) > -1;
  }
  return false;
};

/**
 * 与处理
 * @param arr 需要处理的数据
 * @param opts 条件集合
 */
const $and = <T>(arr: T[], opts: Param<T>[]) => {
  const rules =
    opts.map((val) => {
      return Object.keys(val).map((queryKey) => {
        const qKey = queryKey as keyof T;
        return (data: T) => ruleHeadless(data, qKey, val[qKey] as QueryRule);
      });
    }) || [];
  return arr.filter((val) => {
    return rules
      .map((rule) => {
        return rule.map((r) => r(val)).every((value) => value);
      })
      .every((value) => value);
  });
};

/**
 * 或处理
 * @param arr 需要处理的数据
 * @param opts 条件集合
 */
const $or = <T>(arr: T[], opts: Param<T>[]) => {
  const rules =
    opts.map((val) => {
      return Object.keys(val).map((queryKey) => {
        const qKey = queryKey as keyof T;
        return (data: T) => ruleHeadless(data, qKey, val[qKey] as QueryRule);
      });
    }) || [];
  return arr.filter((val) => {
    return rules
      .map((rule) => {
        return rule.map((r) => r(val)).every((value) => value);
      })
      .some((value) => value);
  });
};

/**
 * 按照指定的规则对指定的字段进行筛选
 * @param data 单条原始数据
 * @param key 指定的字段
 * @param ruleOpt 规则对象
 */
const ruleHeadless = <T>(data: T, key: keyof T, ruleOpt: QueryRule) => {
  if ('$eq' in ruleOpt) {
    const result = $eq(data, key, ruleOpt['$eq']);
    if (!result) {
      return false;
    }
  }
  if ('$gt' in ruleOpt) {
    const result = $gt(data, key, ruleOpt['$gt']);
    if (!result) {
      return false;
    }
  }
  if ('$lt' in ruleOpt) {
    const result = $lt(data, key, ruleOpt['$lt']);
    if (!result) {
      return false;
    }
  }
  if ('$in' in ruleOpt) {
    const result = $in(data, key, ruleOpt['$in'] || []);
    if (!result) {
      return false;
    }
  }

  return true;
};

const sort = <T>(arr: T[], opt: ParamEndRule<T>): T[] => {
  const keys = Object.keys(opt) as (keyof T)[];
  let result = arr;
  keys.forEach((v) => {
    result = arr.sort((a, b) => {
      const aVal = Number(a[v]);
      const bVal = Number(b[v]);
      return Number(opt[v]) * (aVal - bVal);
    });
  });
  return result;
};

const projection = <T>(arr: T[], opt: ParamEndRule<T>): (Partial<T>)[] => {
    const keys = Object.keys(opt) as (keyof T)[];
    return arr.map(v=>{
        let obj:Partial<T> = {};
        keys.forEach(key=>{
            obj[key]= v[key];
        })
        return obj
    })
}

const endHeadless = <T>(arr: T[], options: EndRule<T>): (Partial<T>)[] => {
  let result:(Partial<T>)[] = arr;
  if ('sort' in options && options['sort']) {
    result = sort(result, options['sort']);
  }

  if ('projection' in options && options['projection']) {
    result = projection(result, options['projection']);
  }

  return result;
};

export class Database<T> {
  protected filename: string;
  protected fullTextSearchFieldNames: string[];

  constructor(filename: string, fullTextSearchFieldNames: string[]) {
    this.filename = filename;
    this.fullTextSearchFieldNames = fullTextSearchFieldNames;
  }

  async find(query: Query<T>, options?: EndRule<T>): Promise<T[]> {
    const str = await readFile(this.filename);
    /** 数据库数据 */
    const sqlData = str
      .split('\n')
      .filter((v) => v[0] === 'E')
      .map((v) => JSON.parse(v.slice(1))) as T[];

    /** 执行操作后，返回的结果 */
    let result: T[] = sqlData;
    Object.keys(query).forEach((v) => {
      const key = v as keyof Query<T>;
      if (key === '$and') {
        result = $and(result, query['$and'] || []);
      } else if (key === '$or') {
        result = $or(result, query['$or'] || []);
      } else if (key === '$text') {
        const word = query['$text']?.toLocaleLowerCase();
        const re = new RegExp(`\\b${word}\\b`, 'g');
        result = result.filter((val) =>
          Object.values(val)
            .map((value) => {
              if (typeof value !== 'string') {
                return false;
              }
              return re.test(value.toLocaleLowerCase());
            })
            .some((value) => value)
        );
      } else {
        const opt: QueryRule = query[key] as QueryRule;
        result = result.filter((val) => ruleHeadless(val, key, opt));
      }
    });
    if (options) {
      result = endHeadless(result, options) as T[];
    }

    return result;
  }
}
