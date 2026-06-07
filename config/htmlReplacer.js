export async function htmlReplacer(replaces) {
  let config;

  const transformIndexHtml = (html) => {
    let answer = html;
    for (let index = 0; index < replaces.length; index++) {
      const replace = replaces[index];
      answer = answer.replaceAll(replace.entry, replace.replace);
    }
    return answer;
  }

  return {
    name: 'htmlReplacer',
    enforce: 'post',
    configResolved(resolvedConfig) {
        config = resolvedConfig;
    },
    transform(source) {
        return { code: transformIndexHtml(source), map: undefined };
    },
    transformIndexHtml
  }
}