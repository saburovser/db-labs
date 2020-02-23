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
      type: fieldType as TYPE,
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
        case TYPE.int:
          dataChunk[dataTypes[i].name] = parseInt(dataField);
          break;
        case TYPE.str:
          dataChunk[dataTypes[i].name] = dataField;
          break;
        case TYPE.time:
          const [hours, minutes] = split(dataField, ':');
          const date = new Date();
          date.setHours(parseInt(hours), parseInt(minutes), 0, 0);
          dataChunk[dataTypes[i].name] = date;
          break;
        case TYPE.date:
          dataChunk[dataTypes[i].name] = dataField;
          break;
      }
    });

    parsedData.push(dataChunk);
  });

  return parsedData;
};

async function main() {
  // Считываем и парсим данные из файлов
  let companies: Company[] = await readAndParseFromFile('Company.txt');
  let trips: Trip[] = await readAndParseFromFile('Trip.txt');
  let passInTrips: PassInTrip[] = await readAndParseFromFile('Pass_in_trip.txt');
  let passengers: Passenger[] = await readAndParseFromFile('Passenger.txt');

  [companies, trips, passInTrips, passengers].forEach(array => printFormattedData(array, false));

  /**
    Запрос № 1
  */
  console.log('');
  console.log('Запрос № 1');
  console.log('ABC-анализ пассажиров:');
  // Считаем сумму дохода от полетов каждого пассажира
  passengers.forEach(passenger => {
    const passInTripsForPassenger = passInTrips.filter(trip => trip.ID_psg === passenger.ID_psg);
    const tripsForPassenger = trips.filter(trip =>
        passInTripsForPassenger.find(pitfp => pitfp.trip_no === trip.trip_no)
    );
    const overallFlightTime = tripsForPassenger.reduce((sum, trip) => {
      const flightTime = trip.time_in.getTime() - trip.time_out.getTime();
      return sum + flightTime / 1000;
    }, 0);
    passenger.revenue = overallFlightTime * DOLLARS_PER_FLIGHT_SECOND;
  });

  // Сортируем по доходности
  passengers = passengers.sort((a, b) => b.revenue - a.revenue);

  // Считаем процент дохода, кумулятивный процент и присваиваем категорию
  const overallRevenue = passengers.reduce((sum, passenger) => sum + passenger.revenue, 0);
  passengers.forEach((passenger, index) => {
    passenger.revenuePercent = parseFloat((passenger.revenue / overallRevenue * 100).toFixed(2));
    if (index === 0) {
      passenger.cumulativePercent = passenger.revenuePercent;
    } else {
      passenger.cumulativePercent = passenger.revenuePercent + passengers[index - 1].cumulativePercent;
      passenger.cumulativePercent = parseFloat(passenger.cumulativePercent.toFixed(2));
    }
    if (passenger.cumulativePercent <= 80) {
      passenger.category = CATEGORY.A;
    } else if (passenger.cumulativePercent <= 95) {
      passenger.category = CATEGORY.B;
    } else {
      passenger.category = CATEGORY.C;
    }
  });
  printFormattedData(passengers, true);
  console.log(COLORS.UNSET);

  /**
    Запрос № 2
  */
  console.log('Запрос № 2');
  console.log('Искомые пассажиры:');
  passengers.forEach(passenger => {

    // Для каждого пассажира получаем список его полётов
    const passInTripsForPassenger = passInTrips.filter(trip => trip.ID_psg === passenger.ID_psg);
    const tripsForPassenger = trips.filter(trip =>
        passInTripsForPassenger.find(pitfp => pitfp.trip_no === trip.trip_no)
    );

    // Считаем количество полетов пассажира каждой из авиакомпаний
    let flightCounts: number[] = [];
    companies.forEach(company => {
      let count = 0;
      tripsForPassenger.forEach(trip => {
        if (trip.ID_comp === company.ID_comp) {
          count++;
        }
      });
      if (count > 0) {
        flightCounts.push(count);
      }
    });

    // Проверяем требуемое условие (все элементы массива должны быть равны, а длина > 1
    let condition: boolean = true;
    if (flightCounts.length < 2) {
      condition = false;
    } else {
      for (let i = 0; i < flightCounts.length - 1; i++) {
        if (flightCounts[i] !== flightCounts[i+1]) {
          condition = false;
          break;
        }
      }
    }

    // Вывод подходящего пассажира на экран
    if (condition) {
      console.log(passenger.name);
    }
  });


  /**
   Запрос № 3
   */
  console.log(COLORS.GREEN);
  console.log('Запрос № 3', COLORS.UNSET);
  console.log('Состояние таблиц после удаления данных об авиакомпании \'Аэрофлот\':');

  // Ищем ID компании по её имени в таблице Company
  let ID_comp;
  for (const company of companies) {
    if (company.name === 'Аэрофлот') {
      ID_comp = company.ID_comp;
      break;
    }
  }
  if (ID_comp === undefined) {
    return;
  }

  for (const trip of trips) {
    if (trip.ID_comp === ID_comp) {
      passInTrips = passInTrips.filter(passInTrip => passInTrip.trip_no !== trip.trip_no);
    }
  }

  trips = trips.filter(trip => trip.ID_comp !== ID_comp);

  companies.splice(companies.findIndex(company => company.ID_comp === ID_comp), 1);
  [companies, trips, passInTrips].forEach(array => printFormattedData(array, false));
}

const printFormattedData = (data: Object[], color: boolean): void => {
  let fieldLengths: number[] = [];
  for (const key in data[0]) {
    const fieldWithMaxLength = data.slice().sort((a, b) => {
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
    formattedString += ` | ${supplementField(keys[i], fieldLengths[i])}`
  }
  formattedString += ' |';
  const colorString = COLORS.CYAN;
  console.log((color ? colorString : '') + formattedString.trim());

  data.forEach(element => {
    let formattedString = '';
    const keys = Object.keys(element);
    for (let i = 0; i < keys.length; i++) {
      formattedString += ` | ${supplementField(element[keys[i]], fieldLengths[i])}`
    }
    formattedString += ' |';
    const colorString = getColorString((element as Passenger).category);
    console.log((color ? colorString : '') + formattedString.trim());
  })
};

const supplementField = (field: string | number | Date, length: number): string => {
  let fieldString: string = formatField(field);
  let supplementedString = fieldString;
  const shortage = length - fieldString.length;
  const leftIndex = Math.floor(shortage / 2);
  const rightIndex = shortage - leftIndex;
  for (let i = 0; i < leftIndex; i++) {
    supplementedString = ' ' + supplementedString;
  }
  for (let i = 0; i < rightIndex; i++) {
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
  type: TYPE
}

enum TYPE {
  str = 'str',
  int = 'int',
  time = 'time',
  date = 'date',
}

enum CATEGORY {
  A = 'A',
  B = 'B',
  C = 'C',
}

const getColorString = (category: CATEGORY): string => {
  switch (category) {
    case CATEGORY.A:
      return COLORS.GREEN;
    case CATEGORY.B:
      return COLORS.YELLOW;
    case CATEGORY.C:
      return COLORS.RED;
    default:
      return COLORS.UNSET;
  }
};

enum COLORS {
  BLACK = '\x1b[30m',
  RED = '\x1b[31m',
  GREEN = '\x1b[32m',
  YELLOW = '\x1b[33m',
  BLUE = '\x1b[34m',
  MAGENTA = '\x1b[35m',
  CYAN = '\x1b[36m',
  WHITE = '\x1b[37m',
  UNSET = '\x1b[0m',
}

interface Company {
  ID_comp: number;
  name: string;
}

interface Trip {
  trip_no: number;
  ID_comp: number;
  plane: string;
  town_from: string;
  town_to: string;
  time_out: Date;
  time_in: Date;
}

interface PassInTrip {
  trip_no: number;
  date: string;
  ID_psg: number;
  place: string;
}

interface Passenger {
  ID_psg: number;
  name: string;
  revenue: number;
  revenuePercent: number;
  cumulativePercent: number;
  category: CATEGORY;
}

const DOLLARS_PER_FLIGHT_SECOND = 0.01;
