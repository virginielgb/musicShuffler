const fs = require('fs').promises;
const opn = require('opn');
const path = require('path');

let args = process.argv;
args.splice(0,2);

const options = args.filter(arg => arg[0] === '-').map(option => option.toLowerCase());
args = args.filter(arg => arg[0] !== '-');

const shuffledLocation = './music/shuffled';
let musicLocation = (args[0] || shuffledLocation).replace(/\\/ig,'/');
let finalLocation = shuffledLocation;
const tempLocation = './music/temp';

let progress = {
  percentage: 0,
  text: ''
};

const setFinalLocation = () => {
  finalLocation = options.length > 0 && options.indexOf('-o') >= 0 ? musicLocation :  './music/shuffled';
};
setFinalLocation();

if(options.indexOf('-h') >= 0 || options.indexOf('--help') >= 0) {
  console.log('\x1b[32mWelcome to the music shuffler.\x1b[0m');
  console.log('');
  console.log('You should call this by executing');
  console.log('\x1b[36m       node musicshuffler.js [options] [musicfolder]\x1b[0m');
  console.log('Possible options are :');
  console.log('\x1b[33m  -o               \x1b[0mto override the files in the chosen music folder.');
  console.log('\x1b[33m                   \x1b[0mOtherwise shuffled files will be saved in' + shuffledLocation);
  console.log('\x1b[33m  -w               \x1b[0mto start a web-server for you to choose your music folder');
  console.log('\x1b[33m                   \x1b[0mand see the progress of the shuffle');
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

const updateProgress = (percentage, text) => {
  progress = {percentage, text};
  console.log(new Date().getTime() + ' ===>', progress.text);
};

const main = async () => {
  const startTimeStamp = new Date().getTime();

  updateProgress(0, 'Creating temporary directory...');
  
  try {
    await emptyFolder(tempLocation); 
    await fs.rmdir(tempLocation);
  } catch(e) {
    // do nothing
  }
  await fs.mkdir(tempLocation);

  updateProgress(12, 'Scanning music directory...');
  
  await scanFolder(musicLocation);

  updateProgress(15, 'Shuffling...');

  const newMusicPaths = shuffleArray(allMusicPaths);
  const nbMusicFiles = newMusicPaths.length;

  updateProgress(20, 'Saving ' + nbMusicFiles + ' files to temporary location...');
  
  indexStringSize = ((newMusicPaths.length).toString()).length;
  const newMusicPathsPromises = [];
  newMusicPaths.forEach((pathname, index) => {
    newMusicPathsPromises.push(saveNewMusicFile(pathname, index));
  });

  await Promise.all(newMusicPathsPromises);

  updateProgress(50, 'Emptying end directory...');
  
  await emptyFolder(finalLocation);

  updateProgress(60, 'Saving ' + nbMusicFiles + ' files to end directory...');
  
  const savedMusicPathsPromises = [];
  const tempFiles = await fs.readdir(tempLocation);
  tempFiles.forEach(tempFile => {
    savedMusicPathsPromises.push(copyToEndDirectory(tempFile));
  });

  await Promise.all(savedMusicPathsPromises);

  updateProgress(90, 'Removing temporary directory...');
  
  await emptyFolder(tempLocation); 
  fs.rmdir(tempLocation);

  updateProgress(100, 'All done, your files have been shuffled and saved in ' + finalLocation);
  
  const processTime = new Date().getTime() - startTimeStamp;

  console.log('Total process time : ' + Math.round(processTime / 1000) + 's or about ' + Math.round(processTime/nbMusicFiles) + 'ms per file');
};

const startWebServer = options.indexOf('-w') >= 0;

if(startWebServer) {
  const express = require('express');
  const bodyParser = require('body-parser');
  const app = express();

  const port = 3939;

  app.use(express.static('web'));
  
  const urlencodedParser = bodyParser.urlencoded({ extended: false });

  app.get('/progress', (req, res, next) => {
    res.status(200).send(progress);
  });


  app.post('/shuffle', urlencodedParser, (req, res, next) => {
    if(req.body.musicLocation) {
      musicLocation = req.body.musicLocation;
    }

    for(let i = options.length; i >= 0; i--) {
      options.splice(i, 1);
    }
    if(req.body.override) {
      options.push('-o');
    }
    
    setFinalLocation();
    main();

    const dir = encodeURIComponent(musicLocation.indexOf(__dirname) >= 0 ? musicLocation : path.join(__dirname.replace(/\\/ig,'/'), musicLocation.replace('./', '')));
    res.redirect(`/?dir=${dir}&override=${req.body.override? 1 : 0}&shuffling=1`);
  })

  app.listen(port, () => {
    console.log(`Music shuffler web helper listening at http://localhost:${port}`);
    opn(`http://localhost:${port}/?dir=${path.join(__dirname.replace(/\\/ig,'/'), musicLocation.replace('./', ''))}`);
  });
} else {
  main();
}