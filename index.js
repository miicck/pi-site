var canv = document.createElement("canvas");
canv.className = "background";
var timer;

function pb(x,s)
{
    m = x%s;
    return m < 0 ? s+m : m;
}

function resizeCanvas()
{
    // Setup the canvas/grid size
    canv.width  = window.innerWidth;
    canv.height = window.innerHeight;

    squareSize = 32;
    gapSize = 4;
    xSize = Math.ceil(canv.width / squareSize);
    ySize = Math.ceil(canv.height / squareSize);

    // Initialize the grid to a random pattern
    var grid = [];
    for (var x=0; x<xSize; ++x)
    {
        row = [];
        for (var y =0; y<ySize; ++y)
            row.push(Math.random()>0.8);
        grid.push(row);
    }

    // Get the drawing context
    ctx = canv.getContext("2d");

    // Restart the loop
    clearInterval(timer);
    timer = setInterval(function()
    {
        // Copy the grid
        gridCopy = []
        for (var x=0; x<xSize; ++x)
        {
            row = [];
            for (var y=0; y<ySize; ++y)
                row.push(grid[x][y]);
            gridCopy.push(row);
        }

        // Update the grid
        for (var x=0; x<xSize; ++x)
            for (var y=0; y<ySize; ++y)
            {
                var n = 0;
                for (var dx=-1; dx<2; ++dx)
                    for (var dy=-1; dy<2; ++dy)
                    {
                        if (dx==0 && dy==0) continue;
                        if (gridCopy[pb(x+dx, xSize)][pb(y+dy, ySize)])
                            ++n;
                    }

                if (n < 2) grid[x][y] = false;
                else if (n > 3) grid[x][y] = false;
                else if (n == 3) grid[x][y] = true;
            }

        // Draw the alive grid
        ctx.fillStyle = "#f5f5f5";
        for (var x=0; x<xSize; x++)
            for (var y=0; y<ySize; y++)
                if (grid[x][y] && !gridCopy[x][y]) // Only draw if changed
                    ctx.fillRect(x*squareSize, y*squareSize, squareSize-gapSize, squareSize-gapSize);

        // Draw the dead grid
        ctx.fillStyle = "#fff";
        for (var x=0; x<xSize; x++)
            for (var y=0; y<ySize; y++)
                if (!grid[x][y] && gridCopy[x][y]) // Only draw if changed
                    ctx.fillRect(x*squareSize, y*squareSize, squareSize-gapSize, squareSize-gapSize);

    }, 100);
}

window.addEventListener("resize", resizeCanvas, false);

window.onload = function()
{
    document.body.appendChild(canv);
    resizeCanvas();
}
