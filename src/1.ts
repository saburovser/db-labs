const readAndParseFromFile = (filename: string): Promise<any[]> => {
  return new Promise(resolve => {
    const lineReader = require('readline').createInterface({
      input: require('fs').createReadStream(`./input/${filename}`),
    });

    const rawData: string[][] = [];

    lineReader.on('line', (line: string) => {
      rawData.push(split(line, '|'));
    });

    lineReader.on('close', () => {
      const dataTypes = parseDataTypes(rawData[0]);
      const parsedData = parseData(dataTypes, rawData.slice(1));
      resolve(parsedData);
    });
  })
};

const split = (str: string, separator: string): string[] => {
  let chunk: string = '';
  const result: string[] = [];

  for (let i = 0; i <= str.length; i++) {
    const symbol: string = str[i];
    if (symbol !== separator && i !== str.length) {
      chunk += symbol;
    } else {
      result.push(chunk);
      chunk = '';
    }
  }

  return result;
};

const parseDataTypes = (rawDataTypes: string[]): DataType[] => {
  const parsedDataTypes: DataType[] = [];

  rawDataTypes.forEach(rawDataType => {
    const [fieldName, fieldType] = split(rawDataType, ' ');
    parsedDataTypes.push({
      name: fieldName,
      type: fieldType as Type,
    })
  });

  return parsedDataTypes;
};

const parseData = (dataTypes: DataType[], data: string[][]) => {
  const parsedData = [];

  data.forEach((dataGroup: string[]) => {
    const dataChunk = {};

    dataGroup.forEach((dataField: string, i: number) => {
      switch (dataTypes[i].type) {
        case Type.int:
          dataChunk[dataTypes[i].name] = parseInt(dataField);
          break;
        case Type.str:
          dataChunk[dataTypes[i].name] = dataField;
          break;
        case Type.time:
          const [hours, minutes] = split(dataField, ':');
          const date = new Date();
          date.setHours(parseInt(hours), parseInt(minutes), 0, 0);
          dataChunk[dataTypes[i].name] = date;
          break;
      }
    });

    parsedData.push(dataChunk);
  });

  return parsedData;
};

async function main() {
  Promise.all([
      readAndParseFromFile('Company.txt'),
      readAndParseFromFile('Trip.txt'),
  ]).then(data => {
    data.forEach(printFormattedData);
  });
}

const printFormattedData = (data: any[]): void => {
  let fieldLengths: number[] = [];
  for (const key in data[0]) {
    const fieldWithMaxLength = data.sort((a, b) => {
      const aFormatted = formatField(a[key]);
      const bFormatted = formatField(b[key]);
      return bFormatted.length - aFormatted.length;
    })[0][key];
    const maxFieldLength = Math.max(formatField(fieldWithMaxLength).length, key.length);
    fieldLengths.push(maxFieldLength);
  }

  const keys = Object.keys(data[0]);
  let formattedString = '';
  for (let i = 0; i < keys.length; i++) {
    formattedString += `|${supplementField(keys[i], fieldLengths[i])}`
  }
  formattedString += '|';
  console.log('\x1b[33m%s\x1b[0m', formattedString);

  data.forEach(company => {
    let formattedString = '';
    const keys = Object.keys(company);
    for (let i = 0; i < keys.length; i++) {
      formattedString += `|${supplementField(company[keys[i]], fieldLengths[i])}`
    }
    formattedString += '|';
    console.log(formattedString);
  })
};

const supplementField = (field: string | number | Date, length: number): string => {
  let fieldString: string = formatField(field);
  let supplementedString = fieldString;
  for (let i = 0; i < length - fieldString.length; i++) {
    supplementedString += ' ';
  }
  return supplementedString;
};

const formatField = (field: number | string | Date): string => {
  if (typeof field === 'number') {
    return field.toString();
  } else if (typeof field === 'string') {
    return field;
  } else if (field instanceof Date) {
    let hours = field.getHours().toString();
    if (hours.length === 1) {
      hours = '0' + hours;
    }
    let minutes = field.getMinutes().toString();
    if (minutes.length === 1) {
      minutes += '0';
    }
    return hours + ':' + minutes;
  }
};

main();

class DataType {
  name: string;
  type: Type
}

enum Type {
  str = 'str',
  int = 'int',
  time = 'time',
}
