# musicShuffler
Just a little node script to shuffle files in a folder

You should call this by executing
    `node musicshuffler.js [options] [musicfolder]`
    
Possible options are :

  -m=[value]       to define the maximum number of songs to keep.

  -o               to override the files in the chosen music folder.
                   Otherwise shuffled files will be saved in music/shuffled
                   
  -h | --help      to show this message
                   
  -s               to start the shuffler immediately, and not via the web helper
  
Please note that all subfolders will be deleted in the end location.
Do not use the -o option if you want to preserve your original organisation.

Windows users, you can also download the .exe directly from https://github.com/virginielgb/musicShuffler/tree/master/bin
