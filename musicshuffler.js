const fs = require('fs').promises;
const path = require('path');
let args = process.argv;
args.splice(0,2);

const options = args.filter(arg => arg[0] === '-').map(option => option.toLowerCase());
args = args.filter(arg => arg[0] !== '-');

const shuffledLocation = './music/shuffled';
const musicLocation = (args[0] || shuffledLocation).replace(/\\/ig,'/');
const finalLocation = options.length > 0 && options.indexOf('-o') >= 0 ? musicLocation :  './music/shuffled';
const tempLocation = './music/temp';


if(options.indexOf('-h') >= 0 || options.indexOf('--help') >= 0) {
  console.log('\x1b[32mWelcome to the music shuffler.\x1b[0m');
  console.log('');
  console.log('You should call this by executing');
  console.log('\x1b[36m       node musicshuffler.js [options] [musicfolder]\x1b[0m');
  console.log('Possible options are :');
  console.log('\x1b[33m  -o               \x1b[0mto override the files in the chosen music folder.');
  console.log('\x1b[33m                   \x1b[0mOtherwise shuffled files will be saved in' + shuffledLocation);
  console.log('\x1b[33m  -h | --help      \x1b[0mto show this message')
  console.log('');
  console.log('Please note that all subfolders will be deleted in the end location');
  console.log('Do not use the -o option if you want to preserve your original organisation');
  process.exit(1);
}


const allowedExtensions = [
  '.3gp', '.8svx',
  '.aa', '.aac', '.aax', '.act', '.aiff', '.alac', '.amr', '.ape', '.au', '.awb', 
  '.cda',
  '.dct', '.dst', '.dvf', 
  '.flac',
  '.gsm',
  '.iklax', '.ivs',
  '.m4a', '.m4b', '.m4p', '.mmf', '.mp3', '.mpc', '.msv', '.mogg',
  '.nmf',
  '.off', '.oga','.opus',
  '.ra', '.rm', '.raw', '.rf64',
  '.sln',
  '.tta',
  '.voc', '.vox',
  '.wav', '.wma', '.wb', '.webm'
];


const allMusicPaths = [];
let indexStringSize = 8;

const scanFolder = (pathname) => {
  return new Promise(async (resolve)=> {

    const stat = await fs.lstat(pathname);
    if(stat.isDirectory()) {
      try {
        const files = await fs.readdir(pathname);
        const filePromises = [];
        files.forEach(file => {
          filePromises.push(scanFolder(path.join(pathname, file)));
        });
        Promise.all(filePromises).then(resolve).catch(err => {
          console.error(err);
          resolve();          
        });
      } catch(err) {
        console.error(err);
        resolve();
      }
    } else {
      if(allowedExtensions.indexOf(path.extname(pathname).toLowerCase()) >= 0) {
        allMusicPaths.push(pathname);
      }
      resolve();
    }
  });
};

const shuffleArray = (arr) => {
  const newArray = [];
  while(arr.length > 0) {
    const index = Math.floor(Math.random() * arr.length);
    newArray.push(arr[index]);
    arr.splice(index, 1);
  }
  return newArray;
}

const emptyFolder = function(pathname) {
  return new Promise((resolve)=> {
    fs.readdir(pathname).then(files => {
      const filePromises = [];
      files.forEach(file => {
        filePromises.push(fs.unlink(path.join(pathname, file)))
      });
      Promise.all(filePromises).then(() => {
         resolve();
      }).catch(() => {
         resolve();
      });
    }).catch(() => {
        resolve();
    });
  });
};

const saveNewMusicFile = (pathname, index) => {
  return new Promise((resolve)=> {
    let indexString = index.toString();
    while(indexString.length < indexStringSize) {
      indexString = '0' + indexString;
    }
    const fileName = indexString + '_' + path.basename(pathname).replace(/[0-9]*_/,'');
    return fs.copyFile(pathname, path.join(tempLocation, fileName)).then(resolve).catch(resolve);
  });
}

const copyToEndDirectory = (tempFile) => {
  return new Promise(async (resolve) => {
    const oldLocation = path.join(tempLocation, tempFile);
    await fs.copyFile(oldLocation, path.join(finalLocation, tempFile));
    await fs.unlink(oldLocation);
    resolve();
  })
};

const main = async () => {
  const startTimeStamp = new Date().getTime();
  console.log(new Date().getTime() + ' ===>', 'Creating temporary directory...');
  try {
    await emptyFolder(tempLocation); 
    await fs.rmdir(tempLocation);
  } catch(e) {
    // do nothing
  }
  await fs.mkdir(tempLocation);
  console.log(new Date().getTime() + ' ===>', 'Scanning music directory...');
  await scanFolder(musicLocation);

  console.log(new Date().getTime() + ' ===>', 'Shuffling...');
  const newMusicPaths = shuffleArray(allMusicPaths);
  const nbMusicFiles = newMusicPaths.length;
  console.log(new Date().getTime() + ' ===>', 'Saving ' + nbMusicFiles + ' files to temporary location...');
  indexStringSize = ((newMusicPaths.length).toString()).length;
  const newMusicPathsPromises = [];
  newMusicPaths.forEach((pathname, index) => {
    newMusicPathsPromises.push(saveNewMusicFile(pathname, index));
  });

  await Promise.all(newMusicPathsPromises);

  console.log(new Date().getTime() + ' ===>', 'Emptying end directory...');
  await emptyFolder(finalLocation);

  console.log(new Date().getTime() + ' ===>', 'Saving ' + nbMusicFiles + ' files to end directory...');
  const savedMusicPathsPromises = [];
  const tempFiles = await fs.readdir(tempLocation);
  tempFiles.forEach(tempFile => {
    savedMusicPathsPromises.push(copyToEndDirectory(tempFile));
  });

  await Promise.all(savedMusicPathsPromises)
  console.log(new Date().getTime() + ' ===>', 'Removing temporary directory...');
  await emptyFolder(tempLocation); 
  fs.rmdir(tempLocation);
  console.log(new Date().getTime() + ' ===>', 'All done, your files have been shuffled and saved in ' + finalLocation);

  const processTime = new Date().getTime() - startTimeStamp;

  console.log('Total process time : ' + Math.round(processTime / 1000) + 's or about ' + Math.round(processTime/nbMusicFiles) + 'ms per file');
};

main();