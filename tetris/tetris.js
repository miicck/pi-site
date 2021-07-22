// Setup the canvases
canvas = document.createElement("canvas")
left_canvas = document.createElement("canvas")
right_canvas = document.createElement("canvas") 
canvas.className = "game"
left_canvas.className = "edge"
right_canvas.className = "edge"
document.body.appendChild(left_canvas)
document.body.appendChild(canvas)
document.body.appendChild(right_canvas)

//#################//
// STATE VARIABLES //
//#################//

// Width and heiht of the tetris board
var width  = 10
var height = 20

// The current frame
frame = 0
drop_timer = 0
soft_drop_active = false;

// Is a move right/left requested
dx_requested = 0
frame_dx_requested = -1

// The current piece and the 
// frame it hit something on
current_piece = null
frame_collided = -1
rotation_count = 0
paused = false;

// The different shapes
pieces = 
[
    ["#0FF",[0,0],[1,0],[2,0],[3,0]], // Long boi
    ["#00F",[0,0],[0,1],[1,1],[2,1]], // |__
    ["#F70",[0,1],[1,1],[2,1],[2,0]], //  __|
    ["#FF0",[0,0],[1,0],[0,1],[1,1]], // Square
    ["#0F0",[0,1],[1,1],[1,0],[2,0]], // Stair right
    ["#70F",[0,1],[1,0],[1,1],[2,1]], // T
    ["#F00",[0,0],[1,0],[1,1],[2,1]], // Stair left
]

// The next pieces to drop
piece_queue = []
piece_permutation = []

// The piece being held
held_piece = null;
hold_available = true;

// Setup an empty game board
board = []
for (x=0; x<width; ++x)
{
    row = []
    for (y=0; y<height; ++y)
        row.push(null)
    board.push(row)
}

// Score-related things
score = 0;
lines_cleared = 0;
last_clearance = 0;
is_game_over = false;

//#####################//
// END STATE VARIABLES //
//#####################//

function draw_highscores()
{
    ctx = canvas.getContext("2d");
    ctx.fillStyle = "#F00";
    hs_height = ss*5;
    box_y = (canvas.height-hs_height)/2;
    ctx.fillRect(0, box_y, canvas.width, hs_height);
    ctx.fillStyle = "#000";
    fs = ss/2;
    ctx.font = fs+"px Monospace";
    ctx.fillText("Game over!", fs/2, box_y+fs);
    ctx.fillText("Score: "+score, fs/2, box_y+2*fs);
    ctx.fillText("Press F5 to play again", fs/2, box_y+3*fs);
}

function get_level()
{
    return 1+Math.floor(lines_cleared/10);
}

function time_per_square()
{
    ret = 1.136217904720781*Math.pow(1.2793369092057825, -get_level());
    if (soft_drop_active) ret /= 20.0;
    return ret;
}

function move_piece(dx)
{
    // Check for collision
    for (var i=1; i<current_piece.length; ++i)
    {
        c = current_piece[i];
        xnew = c[0] + dx;
        if (xnew >= width) return;
        if (xnew < 0) return;
        if (board[xnew][c[1]] != null) return;
    }

    for (var i=0; i<current_piece.length; ++i)
        current_piece[i][0] += dx;
}

function position_occupied(x,y)
{
    if (x < 0) return true;
    if (x >= width) return true;
    if (y >= height) return true;
    if (y < 0) return false; // Above is ok
    return board[x][y] != null;
}

function rotate()
{
    ++rotation_count;

    // Work out the centre of mass of the piece
    av_pos = [0,0];
    for (var i=1; i<current_piece.length; ++i)
    {
        c = current_piece[i];
        av_pos[0] += c[0];
        av_pos[1] += c[1];
    }
    av_pos[0] /= (current_piece.length-1);
    av_pos[1] /= (current_piece.length-1);

    // Create a copy of the piece coordinates
    new_pos = [];
    for (var i=1; i<current_piece.length; ++i)
    {
        c = current_piece[i];
        np = [0,0];
        np[0] = c[0];
        np[1] = c[1];
        new_pos.push(np);
    }

    for (var i=0; i<new_pos.length; ++i)
    {
        // Translate to CM frame
        new_pos[i][0] -= av_pos[0];
        new_pos[i][1] -= av_pos[1];

        // Rotate 
        tmp = new_pos[i][0];
        new_pos[i][0] = -new_pos[i][1];
        new_pos[i][1] = tmp;

        // Translate back to game coords
        new_pos[i][0] += av_pos[0];
        new_pos[i][1] += av_pos[1];

        // Go back to integer coords
        if ((rotation_count/4) % 2 == 0)
        {
            new_pos[i][0] = Math.ceil(new_pos[i][0])
            new_pos[i][1] = Math.ceil(new_pos[i][1])
        }
        else
        {
            new_pos[i][0] = Math.floor(new_pos[i][0])
            new_pos[i][1] = Math.floor(new_pos[i][1])
        }
    }

    // Possible nudge amounts
    dxs = [0, 1, -1, 0, 1, -1, 2, -2];
    dys = [0, 0,  0, 1, 1,  1, 0,  0];

    // Loop over nudges
    n_found = -1;
    for (var n=0; n<dxs.length; ++n)
    {
        // Work out if the nudged position is valid
        nudge_valid = true;
        for (var i=0; i<new_pos.length; ++i)
        {
            c = [0,0]
            c[0] = new_pos[i][0] + dxs[n];
            c[1] = new_pos[i][1] + dys[n];
            if (position_occupied(c[0], c[1]))
            {
                nudge_valid = false;
                break;
            }
        }

        if (nudge_valid)
        {
            n_found = n;
            break;
        }
    }

    // No valid nudge found
    if (n_found < 0) return;

    // Move piece to nudged position
    for (var i=0; i<new_pos.length; ++i)
    {
        np = new_pos[i];
        np[0] += dxs[n_found];
        np[1] += dys[n_found];
        current_piece[i+1] = np;
    }
}

function solidify_current()
{
    // Check for end of game/proper placement
    valid = false;
    for (i=1; i<current_piece.length; ++i)
    {
        c = current_piece[i];
        if (c[1] < 0)
        {
            is_game_over = true;
            return;
        }

        if (position_occupied(c[0], c[1]+1))
            valid = true;
    }

    if (!valid) return; // Don't solidify here

    for (i=1; i<current_piece.length; ++i)
    {
        c = current_piece[i];
        board[c[0]][c[1]] = current_piece[0];
    }

    current_piece = null;
    frame_collided = -1;
}

function copy_piece(to_copy)
{
    result = [];
    
    // Copy color
    first = "#F00";
    first = to_copy[0];
    result.push(first);

    // Copy coordinates
    for(i=1; i<to_copy.length; ++i)
    {
        c = [0,0];
        c[0] = to_copy[i][0];
        c[1] = to_copy[i][1];
        result.push(c);
    }

    return result;
}

function get_hard_drop()
{
    // Copy current piece
    var hard_drop = copy_piece(current_piece);

    // Move the hard_drop piece down until
    // it can't move down any more.
    while (true)
    {
        // Check for collision if we move down once
        can_move_down = true;
        for (var i=1; i<hard_drop.length; ++i)
        {
            c = hard_drop[i];
            if (position_occupied(c[0], c[1]+1))
            {
                can_move_down = false;
                break;
            }
        }

        if (can_move_down)
        {
            // Move down once
            for (var i=1; i<hard_drop.length; ++i)
                ++hard_drop[i][1];
        }
        else break; // Can't move down => we're done
    }

    return hard_drop;
}

function moved_to_top_left(piece)
{
    if (piece == null) return null;

    // Copy piece
    var mtt = copy_piece(piece);

    ymin = 10000
    xmin = 10000
    for (i=1; i<mtt.length; ++i)
    {
        c = mtt[i];
        if (c[0] < xmin) xmin = c[0];
        if (c[1] < ymin) ymin = c[1];
    }

    for (i=1; i<mtt.length; ++i)
    {
        c = mtt[i];
        c[0] -= xmin;
        c[1] -= ymin;
    }

    return mtt;
}

function moved_to_top_middle(piece)
{
    if (piece == null) return null;

    // Get at top-left
    var mtm = moved_to_top_left(piece);
    for (i=1; i<mtm.length; ++i)
    {
        mtm[i][0] += Math.floor(width/2)-1;
        mtm[i][1] -= 2;
    }

    return mtm;
}

function hard_drop()
{
    hd = get_hard_drop();
    dy = hd[1][1] - current_piece[1][1];
    score += 2 * dy;
    current_piece = hd;
    solidify_current();
}

function hold()
{
    if (!hold_available) return;
    hold_available = false;
    tmp = held_piece;
    held_piece = moved_to_top_left(current_piece);
    current_piece = moved_to_top_middle(tmp);
}

function keydown(e)
{
    if (is_game_over) return;
    if (e.key == "ArrowRight" || e.key == "d") 
    {
        dx_requested = 1;
        frame_dx_requested = frame;
    }
    else if (e.key == "ArrowLeft" || e.key == "a")
    {
        dx_requested = -1;
        frame_dx_requested = frame;
    }
    else if (e.key == "ArrowUp" || e.key == "w") rotate();
    else if (e.key == " ") hard_drop();
    else if (e.key == "Shift") hold();
    else if (e.key == "ArrowDown" || e.key == "s") soft_drop_active = true;
    else if (e.key == "p") paused = !paused;
}
document.addEventListener('keydown', keydown);

function keyup(e)
{
    if (e.key == "ArrowRight" || e.key == "d")
    {
        if (dx_requested > 0) 
            dx_requested = 0;
    }
    else if (e.key == "ArrowLeft" || e.key == "a")
    {
        if (dx_requested < 0)
            dx_requested = 0;
    }
    else if (e.key == "ArrowDown" || e.key == "s") soft_drop_active = false;
}
document.addEventListener('keyup', keyup);

function piece_height(piece)
{
    min_y = 100;
    max_y = -1;
    for (var i=1; i<piece.length; ++i)
    {
        y = piece[i][1];
        if (y < min_y) min_y = y;
        if (y > max_y) max_y = y;
    }
    return 1 + max_y - min_y;
}

function drop_one()
{
    // Check for collision
    var collided = false
    for (i=1; i<current_piece.length; ++i)
    {
        c = current_piece[i];
        if (c[1] >= height-1)
        {
            // Hit bottom
            collided = true;
            break;
        }

        b = board[c[0]][c[1]+1];
        if (b != null)
        {
            // Hit another piece
            collided = true;
            break;
        }
    }

    // Move the piece
    if (collided)
    {
        if (frame_collided < 0)
            frame_collided = frame;
    }
    else
    {
        frame_collided = -1;
        for (i=1; i<current_piece.length; ++i)
            ++current_piece[i][1];
    }

    if (soft_drop_active) score += 1;
}


function draw()
{
    // Draw the main canvas
    ctx = canvas.getContext("2d")

    // Fill the background
    ctx.fillStyle = "#222"
    ctx.fillRect(0,0,canvas.width, canvas.height)

    // Fill the background board squares
    for (x=0; x<width; ++x)
        for (y=0; y<height; ++y)
        {
            if (board[x][y] != null) ctx.fillStyle = board[x][y];
            else ctx.fillStyle = "#000"
            ctx.fillRect(x*ss+1, y*ss+1, ss-2, ss-2);
        }

    // Draw the shadow of the current piece
    ctx.fillStyle = "#333";
    hd = get_hard_drop();
    for (i=1; i<hd.length; ++i)
    {
        c = hd[i];
        ctx.fillRect(c[0]*ss+1, c[1]*ss+1, ss-2, ss-2);
    }

    // Draw the current piece
    ctx.fillStyle = current_piece[0];
    for (i=1; i<current_piece.length; ++i)
    {
        c = current_piece[i]
        ctx.fillRect(c[0]*ss+1, c[1]*ss+1, ss-2, ss-2);
    }
    
    // Switch to right canvas
    ctx = right_canvas.getContext("2d");

    // Draw the queue
    ctx.fillStyle = "#666";
    ctx.font = ss+"px Monospace";
    ctx.fillText("Next", ss, ss);
    y_offset = 2;
    for (i=0; i<piece_queue.length; ++i)
    {
        p = piece_queue[i];
        ctx.fillStyle = p[0];

        for (j=1; j<p.length; ++j)
        {
            c = p[j];
            ctx.fillRect((c[0]+1)*ss+1, (c[1]+y_offset)*ss+1, ss-2, ss-2);
        }

        y_offset += piece_height(p) + 1;
    }

    // Switch to left canvas
    ctx = left_canvas.getContext("2d");
    ctx.fillStyle = "#666";
    ctx.font = ss+"px Monospace";
    ctx.fillText("Held", ss, ss);

    if (held_piece != null)
    {
        ctx.fillStyle = held_piece[0];
        for (i=1; i<held_piece.length; ++i)
        {
            c = held_piece[i];
            ctx.fillRect((c[0]+1)*ss+1, (c[1]+2)*ss+1, ss-2, ss-2);
        }
    }

    ctx.fillStyle = "#666";
    scs = (ss/2)
    ctx.font = scs+"px Monospace";
    ctx.fillText("Level: "+get_level(), scs, left_canvas.height-scs*3);
    ctx.fillText("Lines: "+lines_cleared, scs, left_canvas.height-scs*2);
    ctx.fillText("Score: "+score, scs, left_canvas.height-scs*1);
}

// start the update cycle
update_interval = setInterval(update, 1000/60)

function update()
{
    if (paused) return;

    // Set canvas to the size it appears as/get context
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    left_canvas.width = left_canvas.offsetWidth;
    left_canvas.height = left_canvas.offsetHeight;
    right_canvas.width = right_canvas.offsetWidth;
    right_canvas.height = right_canvas.offsetHeight;

    // The size of a square on the tetris board
    ss = Math.min(canvas.width/width, canvas.height/height);

    // Check for solidification of current piece
    if (frame_collided > 0 && frame > frame_collided + 30)
    {
        solidify_current();
        frame_collided = -1;
    }

    // Check for clearances
    frame_lines = 0;
    while(true)
    {
        y_cleared = -1;
        for (var y=height-1; y>=0; --y)
        {
            // A clearance has happened
            // below, move row down
            if (y < y_cleared)
            {
                for(var x=0; x<width; ++x)
                    board[x][y+1] = board[x][y];
                continue;
            }

            // Check if this row is cleared
            cleared = true;
            for(var x=0; x<width; ++x)
                if (!position_occupied(x,y))
                {
                    cleared = false;
                    break;
                }

            // If this row was cleared, delete it
            if (cleared)
            {
                ++frame_lines;
                y_cleared = y;
                for (var x=0; x<width; ++x)
                    board[x][y] = null;
            }
        }

        // No clearances found, we're done
        if (y_cleared < 0)
            break;
    }

    // Update score
    lines_cleared += frame_lines;
    if (frame_lines == 1)
    {
        score += 100 * get_level();
        last_clearance = 1;
        console.log("Single clearance");
    }
    else if (frame_lines == 2) 
    {
        score += 300 * get_level();
        last_clearance = 2;
        console.log("Dobule clearance");
    }
    else if (frame_lines == 3)
    {
        score += 500 * get_level();
        last_clearance = 3;
        console.log("Triple clearance");
    }
    else if (frame_lines == 4) 
    {
        // Back to back bonus
        mult = last_clearance == 4 ? 1.5 : 1.0;
        score += mult * 800 * get_level(); // Tetris!
        last_clearance = 4;
        if (mult > 1.25)
            console.log("Back-to-back tetris");
        else 
            console.log("Tetris");
    }

    // Generate a new piece
    if (current_piece == null && piece_queue.length > 0)
    {
        // Get the next piece from the top of the queue
        current_piece = moved_to_top_middle(piece_queue[0]);

        // Shift the queue
        for (i=0; i<piece_queue.length-1; ++i)
            piece_queue[i] = piece_queue[i+1];

        // Add new piece to the end of the queue
        piece_queue.pop();

        // Re-enable hold
        hold_available = true;
    }

    while(piece_queue.length < 3)
    {
        // Generate a new permuatation
        if (piece_permutation.length == 0)
        {
            in_order = [0,1,2,3,4,5,6];
            piece_permutation = [];
            while (in_order.length > 0)
            {
                index = Math.floor(Math.random()*in_order.length);
                piece_permutation.push(in_order[index]);
                in_order[index] = in_order[in_order.length-1];
                in_order.pop();
            }
        }

        // Get the next piece from the permutation
        piece_queue.push(pieces[piece_permutation.pop()]);
    }

    // Process move requests
    var df = frame - frame_dx_requested;
    if (df < 1 || (df > 10 && df % 3 == 0))
    {
        if (dx_requested > 0) move_piece(1);
        if (dx_requested < 0) move_piece(-1);
    }

    // Move the current piece
    drop_timer += 1/60;
    if (drop_timer > time_per_square())
    {
        drop_one();
        drop_timer = 0;
    }

    if (current_piece != null) draw();
    ++frame;

    // Check for end of game
    if (is_game_over)
    {
        clearInterval(update_interval);
        draw_highscores();
    }
}

