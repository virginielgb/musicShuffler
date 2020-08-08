# musicShuffler
Just a little node script to shuffle files in a folder

You should call this by executing
    `node musicshuffler.js [options] [musicfolder]`
    
Possible options are :

  -o               to override the files in the chosen music folder.
                   Otherwise shuffled files will be saved in music/shuffled
                   
  -h | --help      to show this message
                   
  -w               to start a web-server for you to choose your music folder
  
Please note that all subfolders will be deleted in the end location.
Do not use the -o option if you want to preserve your original organisation.
